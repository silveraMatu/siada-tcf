import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { crearAdmin } from '../../src/cli/crear-admin.js';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  dniNuevo,
  habilitarUsuario,
  inicializarDnis,
  registrarUsuarioConCredenciales,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Script crear-admin (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const PASSWORD = 'clave-admin-segura-1';

  const datosNuevos = () => ({
    email: `e2e-crear-admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: PASSWORD,
    dni: dniNuevo(),
    nombre: 'Primer',
    apellido: 'Administrador',
  });

  const login = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

  const filaDe = async (email: string) =>
    (
      await dataSource.query(`SELECT * FROM usuarios WHERE email = $1`, [email])
    )[0];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await inicializarDnis(dataSource);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  it('crea un administrador activo que puede iniciar sesión y usar un endpoint de ADMIN', async () => {
    const datos = datosNuevos();

    expect(await crearAdmin(app, datos)).toBe('creado');

    expect(await filaDe(datos.email)).toMatchObject({
      active: true,
      roles: '{ADMIN}',
    });
    const { body } = await login(datos.email, datos.password).expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
  });

  it('es idempotente: repetirlo no cambia nada', async () => {
    const datos = datosNuevos();
    await crearAdmin(app, datos);
    const antes = await filaDe(datos.email);

    expect(await crearAdmin(app, datos)).toBe('existente');

    expect(await filaDe(datos.email)).toEqual(antes);
  });

  it('promueve a un usuario ya registrado (inactivo y sin roles) sin cambiarle la contraseña', async () => {
    const existente = await registrarUsuarioConCredenciales(app);

    const resultado = await crearAdmin(app, {
      email: existente.email,
      password: 'otra-clave-distinta-1',
      dni: dniNuevo(),
      nombre: 'Otro',
      apellido: 'Nombre',
    });

    expect(resultado).toBe('promovido');
    expect(await filaDe(existente.email)).toMatchObject({
      active: true,
      roles: '{ADMIN}',
    });
    await login(existente.email, existente.password).expect(200);
    await login(existente.email, 'otra-clave-distinta-1').expect(401);
  });

  it('al promover conserva los roles que ya tenía', async () => {
    const existente = await registrarUsuarioConCredenciales(app);
    await habilitarUsuario(app, existente.id, ['AUDITOR']);

    const resultado = await crearAdmin(app, {
      email: existente.email,
      password: existente.password,
      dni: dniNuevo(),
      nombre: 'X',
      apellido: 'Y',
    });

    expect(resultado).toBe('promovido');
    expect((await filaDe(existente.email)).roles).toBe('{AUDITOR,ADMIN}');
  });

  it.each([
    ['email inválido', { email: 'no-es-un-email' }],
    ['contraseña corta', { password: 'corta' }],
    ['DNI inválido', { dni: '12' }],
    ['sin nombre', { nombre: '' }],
  ])('rechaza datos inválidos (%s) sin crear nada', async (_caso, cambio) => {
    const datos = { ...datosNuevos(), ...cambio };

    await expect(crearAdmin(app, datos)).rejects.toThrow();

    const filas = await dataSource.query(
      `SELECT 1 FROM usuarios WHERE dni = $1`,
      [datos.dni],
    );
    expect(filas).toHaveLength(0);
  });
});
