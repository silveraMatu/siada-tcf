import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  crearUsuarioResponsable,
  habilitarUsuario,
  ID_INEXISTENTE,
  obtenerBearerAdmin,
  registrarUsuarioConCredenciales,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Seguridad: JWT y roles (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let bearerAdmin: string;

  //los 3 endpoints que exigen el rol ADMIN; `autorizacion` es el valor del header Authorization (opcional)
  const protegidos: [string, (autorizacion?: string) => request.Test][] = [
    [
      'GET /usuarios',
      (autorizacion) =>
        conHeader(
          request(app.getHttpServer()).get('/api/v1/usuarios'),
          autorizacion,
        ),
    ],
    [
      'PATCH /usuarios/:id/activar',
      (autorizacion) =>
        conHeader(
          request(app.getHttpServer())
            .patch(`/api/v1/usuarios/${ID_INEXISTENTE}/activar`)
            .send({ active: true, roles: ['ADMIN'] }),
          autorizacion,
        ),
    ],
    [
      'PATCH /responsables/:id/organismo',
      (autorizacion) =>
        conHeader(
          request(app.getHttpServer())
            .patch(`/api/v1/responsables/${ID_INEXISTENTE}/organismo`)
            .send({ organismoId: 1 }),
          autorizacion,
        ),
    ],
  ];

  const conHeader = (peticion: request.Test, autorizacion?: string) =>
    autorizacion ? peticion.set('Authorization', autorizacion) : peticion;

  const login = async (email: string, password: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return `Bearer ${res.body.accessToken}`;
  };

  //registra un usuario, lo habilita con esos roles y devuelve su id y un header Authorization
  const usuarioConRoles = async (roles: string[]) => {
    const { id, email, password } = await registrarUsuarioConCredenciales(app);
    await habilitarUsuario(app, id, roles);
    return { id, email, bearer: await login(email, password) };
  };

  const cambiarUsuario = (id: number, body: object) =>
    request(app.getHttpServer())
      .patch(`/api/v1/usuarios/${id}/activar`)
      .set('Authorization', bearerAdmin)
      .send(body)
      .expect(200);

  beforeAll(async () => {
    ({ app } = await createTestApp());
    jwtService = app.get(JwtService, { strict: false });
    bearerAdmin = await obtenerBearerAdmin(app);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe.each(protegidos)('%s', (_nombre, peticion) => {
    it('401: sin token', async () => {
      await peticion().expect(401);
    });

    it('401: con un esquema distinto de Bearer', async () => {
      await peticion('Basic YWRtaW46YWRtaW4=').expect(401);
    });

    it('401: con un token mal formado', async () => {
      await peticion('Bearer esto-no-es-un-jwt').expect(401);
    });

    it('401: con la firma alterada', async () => {
      await peticion(`${bearerAdmin.slice(0, -2)}xx`).expect(401);
    });

    it('401: firmado con otro secreto', async () => {
      const { sub } = jwtService.decode(bearerAdmin.replace('Bearer ', ''));
      const ajeno = new JwtService({ secret: 'otro-secreto-'.repeat(4) }).sign({
        sub,
        email: 'e2e-admin@example.com',
        roles: ['ADMIN'],
      });

      await peticion(`Bearer ${ajeno}`).expect(401);
    });

    it('401: token vencido', async () => {
      const { sub } = jwtService.decode(bearerAdmin.replace('Bearer ', ''));
      const ahora = Math.floor(Date.now() / 1000);
      const vencido = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub,
        email: 'e2e-admin@example.com',
        roles: ['ADMIN'],
        iat: ahora - 7200,
        exp: ahora - 3600,
      });

      await peticion(`Bearer ${vencido}`).expect(401);
    });

    it('401: token sin firma (alg none)', async () => {
      const codificar = (objeto: object) =>
        Buffer.from(JSON.stringify(objeto)).toString('base64url');
      const sinFirma = `${codificar({ alg: 'none', typ: 'JWT' })}.${codificar({ sub: 1, roles: ['ADMIN'] })}.`;

      await peticion(`Bearer ${sinFirma}`).expect(401);
    });

    it('403: usuario activo sin el rol ADMIN', async () => {
      const { bearer } = await usuarioConRoles(['AUDITOR']);

      await peticion(bearer).expect(403);
    });

    it('pasa los guards con el rol ADMIN (responde 200 o el error propio del endpoint)', async () => {
      const res = await peticion(bearerAdmin);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('el estado actual del usuario manda sobre el contenido del token', () => {
    it('401: un token válido deja de servir si el usuario es desactivado', async () => {
      const admin = await usuarioConRoles(['ADMIN']);
      await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('Authorization', admin.bearer)
        .expect(200);

      await cambiarUsuario(admin.id, { active: false, roles: [] });

      await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('Authorization', admin.bearer)
        .expect(401);
    });

    it('403: un token emitido cuando era ADMIN deja de servir si le quitan el rol', async () => {
      const admin = await usuarioConRoles(['ADMIN']);

      await cambiarUsuario(admin.id, { active: true, roles: ['AUDITOR'] });

      await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('Authorization', admin.bearer)
        .expect(403);
    });

    it('200: un usuario al que luego le dan el rol ADMIN puede usar su token anterior', async () => {
      const usuario = await usuarioConRoles(['AUDITOR']);
      await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('Authorization', usuario.bearer)
        .expect(403);

      await cambiarUsuario(usuario.id, { active: true, roles: ['ADMIN'] });

      await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('Authorization', usuario.bearer)
        .expect(200);
    });
  });

  describe('endpoints públicos', () => {
    it('responden sin token', async () => {
      const http = app.getHttpServer();

      await request(http).get('/api/v1/organismos').expect(200);
      //400 por el body vacío: llegan a validar, no los frena la autenticación
      await request(http).post('/api/v1/auth/registro').send({}).expect(400);
      await request(http).post('/api/v1/auth/login').send({}).expect(400);
      await request(http)
        .post('/api/v1/cuentas-mensuales/resolver')
        .send({})
        .expect(400);
      await request(http).post('/api/v1/responsables').send({}).expect(400);
    });

    it('crear un responsable sigue siendo público (el usuario ya debe estar habilitado)', async () => {
      const usuarioId = await crearUsuarioResponsable(app);

      await request(app.getHttpServer())
        .post('/api/v1/responsables')
        .send({ usuarioId })
        .expect(201);
    });
  });
});
