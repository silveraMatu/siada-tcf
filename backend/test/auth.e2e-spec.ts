import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const PASSWORD = 'clave-segura-123';

  //cada usuario usa email y cuitDni propios de la corrida para que los tests sean idempotentes
  const base = Date.now() % 1_000_000_000;
  let contador = 0;
  const unico = () => {
    contador += 1;
    return {
      email: `e2e-${base}-${contador}@example.com`,
      cuitDni: `20${String(base + contador).padStart(9, '0')}`,
    };
  };
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
        cuitDni: body.cuitDni,
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
        cuit_dni: body.cuitDni,
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

    it('201: normaliza email (minúsculas), espacios y separadores del cuitDni', async () => {
      const { email, cuitDni } = unico();
      const res = await registrar(
        valido({
          nombre: '  Luis  ',
          email: `  ${email.toUpperCase()}  `,
          cuitDni: `${cuitDni.slice(0, 2)}-${cuitDni.slice(2, 10)}-${cuitDni.slice(10)}`,
        }),
      ).expect(201);
      expect(res.body).toMatchObject({ nombre: 'Luis', email, cuitDni });
    });

    it('201: acepta un DNI de 8 dígitos', async () => {
      const dni = String(10_000_000 + (base % 80_000_000) + contador++);
      await registrar(valido({ cuitDni: dni })).expect(201);
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

    it('409: cuitDni ya registrado (también con otro formato), con mensaje genérico', async () => {
      const existente = valido();
      await registrar(existente).expect(201);

      const mismo = await registrar(
        valido({ cuitDni: existente.cuitDni }),
      ).expect(409);
      const conGuiones = `${existente.cuitDni.slice(0, 2)}-${existente.cuitDni.slice(2, 10)}-${existente.cuitDni.slice(10)}`;
      const otroFormato = await registrar(
        valido({ cuitDni: conGuiones }),
      ).expect(409);

      expect(mismo.body.message).toBe(MENSAJE_CONFLICTO);
      expect(otroFormato.body.message).toBe(MENSAJE_CONFLICTO);
      expect(JSON.stringify(mismo.body)).not.toContain(existente.cuitDni);
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
      ['sin cuitDni', () => valido({ cuitDni: undefined })],
      ['cuitDni vacio', () => valido({ cuitDni: '' })],
      ['cuitDni con letras', () => valido({ cuitDni: '2012345678A' })],
      ['cuitDni demasiado corto', () => valido({ cuitDni: '123456' })],
      ['cuitDni de 9 digitos', () => valido({ cuitDni: '123456789' })],
      ['cuitDni de 12 digitos', () => valido({ cuitDni: '201234567890' })],
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
  });
});
