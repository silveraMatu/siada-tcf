import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  habilitarUsuario,
  obtenerBearerAdmin,
  registrarUsuarioConCredenciales,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Login (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const MENSAJE_INVALIDAS = 'Credenciales inválidas';
  const MENSAJE_PENDIENTE =
    'Su cuenta está pendiente de activación por un administrador';

  const login = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(body as object);

  beforeAll(async () => {
    ({ app } = await createTestApp());
    jwtService = app.get(JwtService, { strict: false });
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('200: devuelve solo el accessToken, firmado y con id, email y roles', async () => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['AUDITOR', 'JUEZ_TRAMITE']);

      const res = await login({ email, password }).expect(200);

      expect(Object.keys(res.body)).toEqual(['accessToken']);
      const payload = await jwtService.verifyAsync(res.body.accessToken);
      expect(payload).toEqual({
        sub: id,
        email,
        roles: ['AUDITOR', 'JUEZ_TRAMITE'],
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
      //el token vale 12 horas
      expect(payload.exp - payload.iat).toBe(12 * 60 * 60);
    });

    it('200: el token no contiene la contraseña ni su hash', async () => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['AUDITOR']);

      const res = await login({ email, password }).expect(200);

      const payload = JSON.stringify(jwtService.decode(res.body.accessToken));
      expect(payload).not.toContain('password');
      expect(payload).not.toContain('$2b$');
      expect(JSON.stringify(res.body)).not.toContain(password);
    });

    it('200: acepta el email con mayúsculas y espacios', async () => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['AUDITOR']);

      await login({ email: `  ${email.toUpperCase()}  `, password }).expect(
        200,
      );
    });

    it('401: contraseña incorrecta', async () => {
      const { id, email } = await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['AUDITOR']);

      const res = await login({ email, password: 'otra-clave-123' }).expect(
        401,
      );

      expect(res.body.message).toBe(MENSAJE_INVALIDAS);
    });

    it('401: el email no existe, con el mismo mensaje que una contraseña incorrecta', async () => {
      const res = await login({
        email: `no-existe-${Date.now()}@example.com`,
        password: 'clave-segura-123',
      }).expect(401);

      expect(res.body.message).toBe(MENSAJE_INVALIDAS);
    });

    it('401: cuenta sin activar, con la contraseña correcta', async () => {
      const { email, password } = await registrarUsuarioConCredenciales(app);

      const res = await login({ email, password }).expect(401);

      expect(res.body.message).toBe(MENSAJE_PENDIENTE);
    });

    it('401: cuenta sin activar con contraseña incorrecta no revela que está pendiente', async () => {
      const { email } = await registrarUsuarioConCredenciales(app);

      const res = await login({ email, password: 'otra-clave-123' }).expect(
        401,
      );

      expect(res.body.message).toBe(MENSAJE_INVALIDAS);
    });

    it('401: usuario que fue desactivado por un administrador después', async () => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['AUDITOR']);
      await login({ email, password }).expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/usuarios/${id}/activar`)
        .set('Authorization', await obtenerBearerAdmin(app))
        .send({ active: false, roles: [] })
        .expect(200);

      const res = await login({ email, password }).expect(401);
      expect(res.body.message).toBe(MENSAJE_PENDIENTE);
    });

    it.each([
      ['body vacio', {}],
      ['sin email', { password: 'clave-segura-123' }],
      [
        'email invalido',
        { email: 'no-es-un-email', password: 'clave-segura-123' },
      ],
      ['sin password', { email: 'a@example.com' }],
      ['password vacio', { email: 'a@example.com', password: '' }],
      [
        'password de mas de 72 bytes',
        { email: 'a@example.com', password: 'a'.repeat(73) },
      ],
      ['email numerico', { email: 123, password: 'clave-segura-123' }],
      ['password numerico', { email: 'a@example.com', password: 12345678 }],
    ])('400: %s', async (_caso, body) => {
      await login(body).expect(400);
    });
  });

  describe('token', () => {
    it('una firma alterada no verifica', async () => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['AUDITOR']);
      const { body } = await login({ email, password }).expect(200);

      const alterado = body.accessToken.slice(0, -2) + 'xx';

      await expect(jwtService.verifyAsync(alterado)).rejects.toThrow();
    });
  });
});
