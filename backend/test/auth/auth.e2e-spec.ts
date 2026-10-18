import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  dniDeSieteDigitosLibre,
  dniNuevo,
  inicializarDnis,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const PASSWORD = 'clave-segura-123';

  //cada usuario usa email y DNI propios para que los tests sean idempotentes
  const base = Date.now() % 1_000_000_000;
  let contador = 0;
  const unico = () => {
    contador += 1;
    return { email: `e2e-${base}-${contador}@example.com`, dni: dniNuevo() };
  };
  //12345678 => 12.345.678
  const conPuntos = (dni: string) =>
    `${dni.slice(0, -6)}.${dni.slice(-6, -3)}.${dni.slice(-3)}`;
  const valido = (extra: Record<string, unknown> = {}) => ({
    nombre: 'Ana',
    apellido: 'Pérez',
    password: PASSWORD,
    ...unico(),
    ...extra,
  });

  const registrar = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/registro')
      .send(body as object);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await inicializarDnis(dataSource);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /auth/registro', () => {
    it('201: crea el usuario inactivo y sin roles, sin exponer la contraseña', async () => {
      const body = valido();
      const res = await registrar(body).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        nombre: 'Ana',
        apellido: 'Pérez',
        dni: body.dni,
        email: body.email,
        active: false,
        roles: [],
        fechaCreacion: expect.any(String),
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    });

    it('201: guarda la contraseña hasheada con bcrypt y el usuario inactivo en la BD', async () => {
      const body = valido();
      const res = await registrar(body).expect(201);

      const [fila] = await dataSource.query(
        `SELECT * FROM usuarios WHERE id = $1`,
        [res.body.id],
      );
      expect(fila).toMatchObject({
        email: body.email,
        dni: body.dni,
        active: false,
        //pg devuelve los arrays de enums personalizados como texto crudo
        roles: '{}',
      });
      expect(fila.password).not.toBe(PASSWORD);
      expect(fila.password).toMatch(/^\$2[aby]\$10\$/);
      expect(await bcrypt.compare(PASSWORD, fila.password)).toBe(true);
    });

    it('201: ignora `active` y `roles` enviados por el cliente', async () => {
      const res = await registrar(
        valido({ active: true, roles: ['ADMIN'] }),
      ).expect(201);
      expect(res.body).toMatchObject({ active: false, roles: [] });
    });

    it('201: normaliza email (minúsculas), espacios y puntos del DNI', async () => {
      const { email, dni } = unico();
      const res = await registrar(
        valido({
          nombre: '  Luis  ',
          email: `  ${email.toUpperCase()}  `,
          dni: conPuntos(dni),
        }),
      ).expect(201);
      expect(res.body).toMatchObject({ nombre: 'Luis', email, dni });
    });

    it('201: acepta un DNI de 7 dígitos', async () => {
      const dni = await dniDeSieteDigitosLibre(dataSource);
      const res = await registrar(valido({ dni })).expect(201);
      expect(res.body.dni).toBe(dni);
    });

    //mismo mensaje en todos los casos: no debe revelar cual dato existe ni incluirlo
    const MENSAJE_CONFLICTO =
      'No se pudo completar el registro con los datos ingresados.';

    it('409: email ya registrado (también con otra capitalización), con mensaje genérico', async () => {
      const existente = valido();
      await registrar(existente).expect(201);

      const mismo = await registrar(valido({ email: existente.email })).expect(
        409,
      );
      const mayusculas = await registrar(
        valido({ email: existente.email.toUpperCase() }),
      ).expect(409);

      expect(mismo.body.message).toBe(MENSAJE_CONFLICTO);
      expect(mayusculas.body.message).toBe(MENSAJE_CONFLICTO);
      expect(JSON.stringify(mismo.body)).not.toContain(existente.email);
    });

    it('409: DNI ya registrado (también con otro formato), con mensaje genérico', async () => {
      const existente = valido();
      await registrar(existente).expect(201);

      const mismo = await registrar(valido({ dni: existente.dni })).expect(409);
      const otroFormato = await registrar(
        valido({ dni: conPuntos(existente.dni) }),
      ).expect(409);

      expect(mismo.body.message).toBe(MENSAJE_CONFLICTO);
      expect(otroFormato.body.message).toBe(MENSAJE_CONFLICTO);
      expect(JSON.stringify(mismo.body)).not.toContain(existente.dni);
    });

    it('409 (no 500): dos registros concurrentes con el mismo email, con el mismo mensaje genérico', async () => {
      const email = unico().email;
      const resultados = await Promise.all([
        registrar(valido({ email })),
        registrar(valido({ email })),
      ]);

      expect(resultados.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      const conflicto = resultados.find((r) => r.status === 409)!;
      expect(conflicto.body.message).toBe(MENSAJE_CONFLICTO);
    });

    it.each([
      ['body vacio', () => ({})],
      ['sin nombre', () => valido({ nombre: undefined })],
      ['nombre vacio', () => valido({ nombre: '   ' })],
      ['nombre de 256 caracteres', () => valido({ nombre: 'n'.repeat(256) })],
      ['sin apellido', () => valido({ apellido: undefined })],
      ['sin email', () => valido({ email: undefined })],
      ['email invalido', () => valido({ email: 'no-es-un-email' })],
      ['sin dni', () => valido({ dni: undefined })],
      ['dni vacio', () => valido({ dni: '' })],
      ['dni con letras', () => valido({ dni: '1234567A' })],
      ['dni demasiado corto (6 digitos)', () => valido({ dni: '123456' })],
      ['dni de 9 digitos', () => valido({ dni: '123456789' })],
      [
        'un CUIT de 11 digitos ya no se acepta',
        () => valido({ dni: '20123456789' }),
      ],
      [
        'formato anterior con cuitDni en lugar de dni',
        () => valido({ dni: undefined, cuitDni: '20123456789' }),
      ],
      ['sin password', () => valido({ password: undefined })],
      ['password de 7 caracteres', () => valido({ password: '1234567' })],
      [
        'password de mas de 72 bytes',
        () => valido({ password: 'a'.repeat(73) }),
      ],
      [
        'password multibyte de mas de 72 bytes',
        () => valido({ password: 'ñ'.repeat(37) }),
      ],
      ['password numerico', () => valido({ password: 12345678 })],
    ])('400: %s', async (_caso, armarBody) => {
      await registrar(armarBody()).expect(400);
    });

    it('201: acepta una contraseña de exactamente 72 bytes', async () => {
      await registrar(valido({ password: 'a'.repeat(72) })).expect(201);
    });

    //el limite de 10mb es solo para la ingesta de libros: este endpoint es publico
    it('413: rechaza bodies de más de 100kb antes de validar', async () => {
      await registrar(valido({ nombre: 'n'.repeat(150_000) })).expect(413);
    });
  });
});
