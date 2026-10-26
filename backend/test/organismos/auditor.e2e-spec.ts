import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  crearAuditorConSesion,
  crearResponsableConSesion,
  crearSesionConRol,
  habilitarUsuario,
  obtenerBearerAdmin,
  registrarUsuarioConCredenciales,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: cada prueba trabaja con organismos y
//auditores nuevos, así no depende de lo que haya antes.
describe('Auditor asignado al organismo (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let bearerAdmin: string;
  let bearerJuez: string;

  const api = () => request(app.getHttpServer());
  const crearOrganismo = async (): Promise<number> => {
    const res = await api()
      .post('/api/v1/organismos')
      .set('Authorization', bearerAdmin)
      .send({
        nombre: `__E2E__ Auditor ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rubro: 'E2E',
      })
      .expect(201);
    return res.body.id;
  };
  const asignar = (
    organismoId: number | string,
    body: unknown,
    bearer = bearerJuez,
  ) =>
    api()
      .put(`/api/v1/organismos/${organismoId}/auditor`)
      .set('Authorization', bearer)
      .send(body as object);
  const quitar = (organismoId: number | string, bearer = bearerJuez) =>
    api()
      .delete(`/api/v1/organismos/${organismoId}/auditor`)
      .set('Authorization', bearer);
  const listarOrganismos = async () =>
    (
      await api()
        .get('/api/v1/organismos')
        .set('Authorization', bearerJuez)
        .expect(200)
    ).body as {
      id: number;
      auditorId: number | null;
      auditor: { id: number; nombre: string; apellido: string } | null;
    }[];
  const deOrganismo = (
    todos: Awaited<ReturnType<typeof listarOrganismos>>,
    id: number,
  ) => todos.find((o) => o.id === id)!;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);
    bearerJuez = await crearSesionConRol(app, 'JUEZ_TRAMITE');
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('seguridad', () => {
    it('401 sin token en los tres endpoints', async () => {
      const organismoId = await crearOrganismo();

      await api()
        .put(`/api/v1/organismos/${organismoId}/auditor`)
        .send({ auditorId: 1 })
        .expect(401);
      await api()
        .delete(`/api/v1/organismos/${organismoId}/auditor`)
        .expect(401);
      await api().get('/api/v1/organismos/auditores').expect(401);
    });

    it.each(['AUDITOR', 'RESPONSABLE', 'SUPERVISOR'] as const)(
      '403: el rol %s no puede asignar, quitar ni listar auditores',
      async (rol) => {
        const organismoId = await crearOrganismo();
        const bearer = await crearSesionConRol(app, rol);

        await asignar(organismoId, { auditorId: 1 }, bearer).expect(403);
        await quitar(organismoId, bearer).expect(403);
        await api()
          .get('/api/v1/organismos/auditores')
          .set('Authorization', bearer)
          .expect(403);
      },
    );
  });

  describe('PUT /organismos/:organismoId/auditor', () => {
    it('200: el juez asigna un auditor y el listado de organismos lo muestra', async () => {
      const organismoId = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app);

      const res = await asignar(organismoId, {
        auditorId: auditor.usuarioId,
      }).expect(200);

      expect(res.body).toMatchObject({
        id: organismoId,
        auditorId: auditor.usuarioId,
        auditor: { id: auditor.usuarioId, nombre: 'Fixture', apellido: 'E2E' },
      });
      //nunca se expone nada más del auditor (contraseña, DNI, email)
      expect(Object.keys(res.body.auditor).sort()).toEqual([
        'apellido',
        'id',
        'nombre',
      ]);
      expect(deOrganismo(await listarOrganismos(), organismoId).auditorId).toBe(
        auditor.usuarioId,
      );
    });

    it('200: un ADMIN también puede asignar', async () => {
      const organismoId = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app);

      const res = await asignar(
        organismoId,
        { auditorId: auditor.usuarioId },
        bearerAdmin,
      ).expect(200);

      expect(res.body.auditorId).toBe(auditor.usuarioId);
    });

    it('200: asignar otro auditor reemplaza al anterior y la bitácora conserva ambos', async () => {
      const organismoId = await crearOrganismo();
      const primero = await crearAuditorConSesion(app);
      const segundo = await crearAuditorConSesion(app);
      await asignar(organismoId, { auditorId: primero.usuarioId }).expect(200);

      await asignar(organismoId, { auditorId: segundo.usuarioId }).expect(200);

      expect(deOrganismo(await listarOrganismos(), organismoId).auditorId).toBe(
        segundo.usuarioId,
      );
      const eventos = await dataSource.query(
        `SELECT * FROM registro_actividad WHERE accion = 'AUDITOR_ASIGNADO' AND organismo_id = $1 ORDER BY id`,
        [organismoId],
      );
      expect(eventos).toHaveLength(2);
      expect(eventos[1]).toMatchObject({
        resultado: 'EXITO',
        entidad_tipo: 'ORGANISMO',
        entidad_id: organismoId,
        roles: ['JUEZ_TRAMITE'],
        detalle: {
          auditorAnteriorId: primero.usuarioId,
          auditorNuevoId: segundo.usuarioId,
        },
      });
      //quién lo hizo: el juez, con su nombre y DNI
      expect(eventos[1].dni).toEqual(expect.any(String));
    });

    it('un mismo auditor puede llevar varios organismos', async () => {
      const uno = await crearOrganismo();
      const otro = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app);

      await asignar(uno, { auditorId: auditor.usuarioId }).expect(200);
      await asignar(otro, { auditorId: auditor.usuarioId }).expect(200);

      const todos = await listarOrganismos();
      expect(deOrganismo(todos, uno).auditorId).toBe(auditor.usuarioId);
      expect(deOrganismo(todos, otro).auditorId).toBe(auditor.usuarioId);
    });

    it('404: el organismo o el usuario no existen', async () => {
      const organismoId = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app);

      await asignar(ID_INEXISTENTE, { auditorId: auditor.usuarioId }).expect(
        404,
      );
      await asignar(organismoId, { auditorId: ID_INEXISTENTE }).expect(404);
    });

    it('409: el usuario no tiene el rol AUDITOR o está inactivo, y el organismo queda sin auditor', async () => {
      const organismoId = await crearOrganismo();
      const sinRol = await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, sinRol.id, ['RESPONSABLE']);
      const inactivo = await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, inactivo.id, ['AUDITOR']);
      await api()
        .patch(`/api/v1/usuarios/${inactivo.id}/activar`)
        .set('Authorization', bearerAdmin)
        .send({ active: false, roles: ['AUDITOR'] })
        .expect(200);

      await asignar(organismoId, { auditorId: sinRol.id }).expect(409);
      await asignar(organismoId, { auditorId: inactivo.id }).expect(409);
      //un usuario que todavía no fue activado tampoco sirve
      const pendiente = await registrarUsuarioConCredenciales(app);
      await asignar(organismoId, { auditorId: pendiente.id }).expect(409);

      expect(
        deOrganismo(await listarOrganismos(), organismoId).auditorId,
      ).toBeNull();
    });

    it('409: el organismo está inactivo', async () => {
      const organismoId = await crearOrganismo();
      await dataSource.query(
        `UPDATE organismos SET active = false WHERE id = $1`,
        [organismoId],
      );
      const auditor = await crearAuditorConSesion(app);

      await asignar(organismoId, { auditorId: auditor.usuarioId }).expect(409);
    });

    it.each([
      ['sin auditorId', {}],
      ['auditorId que no es número', { auditorId: 'a' }],
      ['auditorId negativo', { auditorId: -1 }],
      ['auditorId decimal', { auditorId: 1.5 }],
    ])('400: %s', async (_caso, cuerpo) => {
      const organismoId = await crearOrganismo();

      await asignar(organismoId, cuerpo).expect(400);
    });

    it('400: el id del organismo no es válido', async () => {
      await asignar('abc', { auditorId: 1 }).expect(400);
      await asignar('0', { auditorId: 1 }).expect(400);
    });
  });

  describe('DELETE /organismos/:organismoId/auditor', () => {
    it('200: quita el auditor y la bitácora guarda cuál era', async () => {
      const organismoId = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app);
      await asignar(organismoId, { auditorId: auditor.usuarioId }).expect(200);

      const res = await quitar(organismoId).expect(200);

      expect(res.body).toMatchObject({
        id: organismoId,
        auditorId: null,
        auditor: null,
      });
      const [evento] = await dataSource.query(
        `SELECT * FROM registro_actividad WHERE accion = 'AUDITOR_QUITADO' AND organismo_id = $1`,
        [organismoId],
      );
      expect(evento.detalle).toEqual({
        auditorAnteriorId: auditor.usuarioId,
        auditorNuevoId: null,
      });
    });

    it('409 si el organismo no tiene auditor y 404 si no existe', async () => {
      const organismoId = await crearOrganismo();

      await quitar(organismoId).expect(409);
      await quitar(ID_INEXISTENTE).expect(404);
    });

    it('el auditor quitado deja de poder leer las rendiciones del organismo', async () => {
      const organismoId = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app, organismoId);
      const cuenta = await api()
        .post('/api/v1/cuentas-mensuales/resolver')
        .set('Authorization', bearerAdmin)
        .send({ organismoId, ejercicioFiscal: 2026, mes: 4 })
        .expect(200);
      const ruta = `/api/v1/cuentas-mensuales/${cuenta.body.id}/libro-banco`;
      await api().get(ruta).set('Authorization', auditor.bearer).expect(200);

      await quitar(organismoId).expect(200);

      await api().get(ruta).set('Authorization', auditor.bearer).expect(403);
    });
  });

  describe('GET /organismos/auditores', () => {
    it('lista solo usuarios activos con el rol AUDITOR, sin datos sensibles', async () => {
      const auditor = await crearAuditorConSesion(app);
      const responsable = await crearResponsableConSesion(
        app,
        await crearOrganismo(),
      );
      const inactivo = await crearAuditorConSesion(app);
      await api()
        .patch(`/api/v1/usuarios/${inactivo.usuarioId}/activar`)
        .set('Authorization', bearerAdmin)
        .send({ active: false, roles: ['AUDITOR'] })
        .expect(200);

      const res = await api()
        .get('/api/v1/organismos/auditores')
        .set('Authorization', bearerJuez)
        .expect(200);

      const ids = res.body.map((a: { id: number }) => a.id);
      expect(ids).toContain(auditor.usuarioId);
      expect(ids).not.toContain(responsable.usuarioId);
      expect(ids).not.toContain(inactivo.usuarioId);
      for (const a of res.body)
        expect(Object.keys(a).sort()).toEqual([
          'apellido',
          'email',
          'id',
          'nombre',
        ]);
    });

    it('el responsable no ve al auditor en los datos de su propio organismo', async () => {
      const organismoId = await crearOrganismo();
      const auditor = await crearAuditorConSesion(app);
      await asignar(organismoId, { auditorId: auditor.usuarioId }).expect(200);
      const responsable = await crearResponsableConSesion(app, organismoId);

      const res = await api()
        .get('/api/v1/responsables/me/organismo')
        .set('Authorization', responsable.bearer)
        .expect(200);

      expect(res.body).not.toHaveProperty('auditorId');
      expect(res.body).not.toHaveProperty('auditor');
    });
  });
});
