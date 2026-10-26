import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  MES_BITACORA,
  PASSWORD_FIXTURE,
  cargarIngresosEgresos,
  cargarLibro,
  crearResponsableConSesion,
  crearSesionConRol,
  dniNuevo,
  fijarEstadoCuenta,
  habilitarUsuario,
  inicializarDnis,
  obtenerBearerAdmin,
  obtenerOrganismoBaseId,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

interface Evento {
  id: string;
  accion: string;
  resultado: string;
  codigo_http: number;
  usuario_id: number | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  roles: string[];
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  entidad_tipo: string | null;
  entidad_id: number | null;
  organismo_id: number | null;
  cuenta_mensual_id: number | null;
  detalle: Record<string, unknown> | null;
  ocurrido_en: Date;
}

//Corre contra la base de datos real y NO limpia lo que crea (la bitácora es de solo inserción).
//Cada prueba busca sus eventos por el usuario que ella misma crea, así no depende de lo que haya antes.
describe('Bitácora de actividad (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let bearerAdmin: string;
  let bearerSupervisor: string;

  const api = () => request(app.getHttpServer());
  const eventos = (donde: string, parametros: unknown[]): Promise<Evento[]> =>
    dataSource.query(
      `SELECT * FROM registro_actividad WHERE ${donde} ORDER BY id`,
      parametros,
    );

  //registra un usuario con nombre y DNI propios y devuelve sus datos
  const registrar = async (nombre = 'Bitacora') => {
    await inicializarDnis(dataSource);
    const dni = dniNuevo();
    const email = `e2e-bitacora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const res = await api()
      .post('/api/v1/auth/registro')
      .send({
        nombre,
        apellido: 'Prueba',
        dni,
        email,
        password: PASSWORD_FIXTURE,
      })
      .expect(201);
    return { id: res.body.id as number, dni, email, nombre };
  };
  const login = (email: string, password = PASSWORD_FIXTURE) =>
    api().post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);
    bearerSupervisor = await crearSesionConRol(app, 'SUPERVISOR');
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('qué se registra', () => {
    it('el registro de un usuario: actor, IP, entidad y detalle', async () => {
      const usuario = await registrar();

      const [evento] = await eventos(`usuario_id = $1`, [usuario.id]);

      expect(evento).toMatchObject({
        accion: 'USUARIO_REGISTRADO',
        resultado: 'EXITO',
        codigo_http: 201,
        usuario_id: usuario.id,
        nombre: 'Bitacora',
        apellido: 'Prueba',
        dni: usuario.dni,
        roles: [],
        entidad_tipo: 'USUARIO',
        entidad_id: usuario.id,
        detalle: { email: usuario.email },
      });
      expect(evento.ip).toContain('127.0.0.1');
      expect(evento.request_id).toEqual(expect.any(String));
    });

    it('un login correcto queda a nombre del usuario y uno fallido como DENEGADO sin actor', async () => {
      const usuario = await registrar();
      await habilitarUsuario(app, usuario.id, ['AUDITOR']);

      await login(usuario.email).expect(200);
      await login(usuario.email, 'clave-equivocada-1').expect(401);

      const logins = await eventos(
        `accion = 'LOGIN' AND detalle->>'email' = $1`,
        [usuario.email],
      );
      expect(logins).toHaveLength(2);
      expect(logins[0]).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 200,
        usuario_id: usuario.id,
        dni: usuario.dni,
        roles: ['AUDITOR'],
      });
      //se conserva el email intentado, pero no se sabe quién fue
      expect(logins[1]).toMatchObject({
        resultado: 'DENEGADO',
        codigo_http: 401,
        usuario_id: null,
        dni: null,
      });
    });

    it('activar un usuario: quién lo hizo, sobre quién y qué roles cambiaron', async () => {
      const usuario = await registrar();

      await habilitarUsuario(app, usuario.id, ['RESPONSABLE']);

      const [evento] = await eventos(
        `accion = 'USUARIO_ACTIVADO' AND entidad_id = $1`,
        [usuario.id],
      );
      expect(evento).toMatchObject({
        resultado: 'EXITO',
        entidad_tipo: 'USUARIO',
        roles: ['ADMIN'],
        detalle: {
          active: true,
          rolesAnteriores: [],
          rolesNuevos: ['RESPONSABLE'],
        },
      });
      expect(evento.dni).toEqual(expect.any(String));
    });

    it('un rechazo por falta de permisos (403) y uno por falta de sesión (401) quedan como DENEGADO', async () => {
      const organismoId = await obtenerOrganismoBaseId(dataSource);
      const responsable = await crearResponsableConSesion(app, organismoId);
      const antes = Date.now();

      await api()
        .post('/api/v1/organismos')
        .set('Authorization', responsable.bearer)
        .send({ nombre: 'No debería crearse', rubro: 'X' })
        .expect(403);
      await api()
        .post('/api/v1/organismos')
        .send({ nombre: 'No debería crearse', rubro: 'X' })
        .expect(401);

      const denegados = await eventos(
        `accion = 'ORGANISMO_CREADO' AND resultado = 'DENEGADO' AND ocurrido_en >= $1`,
        [new Date(antes - 1000)],
      );
      const prohibido = denegados.find((e) => e.codigo_http === 403)!;
      const sinSesion = denegados.find((e) => e.codigo_http === 401)!;
      expect(prohibido).toMatchObject({
        usuario_id: responsable.usuarioId,
        roles: ['RESPONSABLE'],
      });
      expect(sinSesion.usuario_id).toBeNull();
    });

    it('los datos de un alta salen de la respuesta (id del organismo creado)', async () => {
      const nombre = `Bitácora ${Date.now()}`;

      const res = await api()
        .post('/api/v1/organismos')
        .set('Authorization', bearerAdmin)
        .send({ nombre, rubro: 'E2E' })
        .expect(201);

      const [evento] = await eventos(
        `accion = 'ORGANISMO_CREADO' AND entidad_id = $1`,
        [res.body.id],
      );
      expect(evento).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 201,
        entidad_tipo: 'ORGANISMO',
      });
    });
  });

  describe('cargas y presentación', () => {
    let cuentaId: number;
    let organismoId: number;
    let bearerResponsable: string;
    let usuarioResponsableId: number;

    beforeAll(async () => {
      organismoId = await obtenerOrganismoBaseId(dataSource);
      cuentaId = await resolverCuentaMensualId(app, organismoId, MES_BITACORA);
      await fijarEstadoCuenta(dataSource, cuentaId);
      const responsable = await crearResponsableConSesion(app, organismoId);
      bearerResponsable = responsable.bearer;
      usuarioResponsableId = responsable.usuarioId;
    });

    it('cada carga y la presentación llevan cuenta, organismo y detalle', async () => {
      await cargarLibro(app, bearerResponsable, cuentaId);
      await cargarIngresosEgresos(app, bearerResponsable, cuentaId);
      await api()
        .patch(`/api/v1/cuentas-mensuales/${cuentaId}/presentar`)
        .set('Authorization', bearerResponsable)
        .expect(200);

      const delResponsable = await eventos(`usuario_id = $1`, [
        usuarioResponsableId,
      ]);
      const por = (accion: string) =>
        delResponsable.find((e) => e.accion === accion)!;

      expect(por('LIBRO_BANCO_CARGADO')).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 201,
        cuenta_mensual_id: cuentaId,
        organismo_id: organismoId,
        detalle: {
          numeroCuentaCte: 'E2E/BASE',
          filas: 2,
          reemplazoSolicitado: true,
        },
      });
      expect(por('INGRESOS_EGRESOS_CARGADO')).toMatchObject({
        cuenta_mensual_id: cuentaId,
        organismo_id: organismoId,
        detalle: { filas: 1 },
      });
      expect(por('CUENTA_PRESENTADA')).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 200,
        entidad_tipo: 'CUENTA_MENSUAL',
        entidad_id: cuentaId,
        cuenta_mensual_id: cuentaId,
        organismo_id: organismoId,
      });
    });

    it('un intento rechazado por una regla de negocio queda como FALLO', async () => {
      //la cuenta ya fue presentada: cargar otro libro es un 409
      await api()
        .post(`/api/v1/cuentas-mensuales/${cuentaId}/libro-banco/ingestar`)
        .set('Authorization', bearerResponsable)
        .send({
          numeroCuentaCte: 'E2E/OTRO',
          transacciones: [
            { aLaOrdenDe: 'X', depositos: 0, retiro: 1, saldo: 9 },
          ],
        })
        .expect(409);

      const fallos = await eventos(
        `usuario_id = $1 AND accion = 'LIBRO_BANCO_CARGADO' AND resultado = 'FALLO'`,
        [usuarioResponsableId],
      );
      expect(fallos).toHaveLength(1);
      expect(fallos[0]).toMatchObject({
        codigo_http: 409,
        cuenta_mensual_id: cuentaId,
        organismo_id: organismoId,
      });
    });
  });

  describe('es de solo inserción', () => {
    it.each([
      ['UPDATE', `UPDATE registro_actividad SET accion = 'X'`],
      ['DELETE', `DELETE FROM registro_actividad`],
      ['TRUNCATE', `TRUNCATE registro_actividad`],
    ])('%s es rechazado por la base', async (_nombre, sql) => {
      await expect(dataSource.query(sql)).rejects.toThrow(/solo inserción/);
    });
  });

  describe('GET /actividad', () => {
    it('401 sin token y 403 para cualquier rol que no sea SUPERVISOR (también ADMIN)', async () => {
      await api().get('/api/v1/actividad').expect(401);
      await api()
        .get('/api/v1/actividad')
        .set('Authorization', bearerAdmin)
        .expect(403);
      for (const rol of ['AUDITOR', 'JUEZ_TRAMITE', 'RESPONSABLE'] as const) {
        await api()
          .get('/api/v1/actividad')
          .set('Authorization', await crearSesionConRol(app, rol))
          .expect(403);
      }
    });

    it('lista del más reciente al más antiguo y filtra por DNI, acción y resultado', async () => {
      const usuario = await registrar();
      await habilitarUsuario(app, usuario.id, ['AUDITOR']);
      await login(usuario.email).expect(200);
      await login(usuario.email, 'otra-clave-123').expect(401);

      const res = await api()
        .get(`/api/v1/actividad?dni=${usuario.dni}`)
        .set('Authorization', bearerSupervisor)
        .expect(200);

      //registro + login exitoso (el fallido no tiene DNI)
      expect(res.body.eventos.map((e: { accion: string }) => e.accion)).toEqual(
        ['LOGIN', 'USUARIO_REGISTRADO'],
      );
      expect(res.body.eventos[0]).toMatchObject({
        id: expect.any(Number),
        ocurridoEn: expect.any(String),
        resultado: 'EXITO',
        codigoHttp: 200,
        usuarioId: usuario.id,
        nombre: 'Bitacora',
        apellido: 'Prueba',
        dni: usuario.dni,
        roles: ['AUDITOR'],
        ip: expect.stringContaining('127.0.0.1'),
        entidadTipo: null,
        detalle: { email: usuario.email },
      });
      expect(res.body.siguienteCursor).toBeNull();

      const denegados = await api()
        .get('/api/v1/actividad?accion=LOGIN&resultado=DENEGADO&limite=200')
        .set('Authorization', bearerSupervisor)
        .expect(200);
      expect(
        denegados.body.eventos.some(
          (e: { detalle: { email?: string } | null }) =>
            e.detalle?.email === usuario.email,
        ),
      ).toBe(true);
      expect(
        denegados.body.eventos.every(
          (e: { resultado: string }) => e.resultado === 'DENEGADO',
        ),
      ).toBe(true);
    });

    it('pagina con cursor sin repetir ni saltear eventos', async () => {
      const usuario = await registrar();
      await habilitarUsuario(app, usuario.id, ['AUDITOR']);
      for (let i = 0; i < 4; i++) await login(usuario.email).expect(200);

      const primera = await api()
        .get(`/api/v1/actividad?usuarioId=${usuario.id}&limite=2`)
        .set('Authorization', bearerSupervisor)
        .expect(200);
      const segunda = await api()
        .get(
          `/api/v1/actividad?usuarioId=${usuario.id}&limite=2&cursor=${primera.body.siguienteCursor}`,
        )
        .set('Authorization', bearerSupervisor)
        .expect(200);
      const tercera = await api()
        .get(
          `/api/v1/actividad?usuarioId=${usuario.id}&limite=2&cursor=${segunda.body.siguienteCursor}`,
        )
        .set('Authorization', bearerSupervisor)
        .expect(200);

      const ids = [primera, segunda, tercera].flatMap((r) =>
        r.body.eventos.map((e: { id: number }) => e.id),
      );
      //registro + 4 logins = 5 eventos, en orden descendente y sin repetidos
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(5);
      expect([...ids].sort((a, b) => b - a)).toEqual(ids);
      expect(primera.body.siguienteCursor).not.toBeNull();
      expect(tercera.body.siguienteCursor).toBeNull();
    });

    it('400 con filtros inválidos', async () => {
      for (const consulta of [
        'accion=INVENTADA',
        'resultado=TAL_VEZ',
        'dni=abc',
        'desde=ayer',
        'limite=0',
        'limite=1000',
        'usuarioId=-1',
      ]) {
        await api()
          .get(`/api/v1/actividad?${consulta}`)
          .set('Authorization', bearerSupervisor)
          .expect(400);
      }
    });
  });

  describe('GET /actividad/exportar', () => {
    it('403 si no es SUPERVISOR', async () => {
      await api()
        .get('/api/v1/actividad/exportar')
        .set('Authorization', bearerAdmin)
        .expect(403);
    });

    it('devuelve un CSV con encabezado y las filas filtradas, y queda registrado', async () => {
      const usuario = await registrar();

      const res = await api()
        .get(`/api/v1/actividad/exportar?dni=${usuario.dni}`)
        .set('Authorization', bearerSupervisor)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('actividad.csv');
      const lineas = res.text.replace(/^﻿/, '').trim().split('\r\n');
      expect(lineas[0]).toBe(
        'id,fecha_hora,accion,resultado,codigo_http,usuario_id,nombre,apellido,dni,roles,ip,entidad_tipo,entidad_id,organismo_id,cuenta_mensual_id,detalle',
      );
      expect(lineas).toHaveLength(2);
      expect(lineas[1]).toContain('"USUARIO_REGISTRADO"');
      expect(lineas[1]).toContain(`"${usuario.dni}"`);

      //la propia exportación queda en la bitácora, a nombre del supervisor
      const exportaciones = await eventos(`accion = 'ACTIVIDAD_EXPORTADA'`, []);
      expect(exportaciones.length).toBeGreaterThan(0);
      expect(exportaciones.at(-1)).toMatchObject({
        resultado: 'EXITO',
        roles: ['SUPERVISOR'],
      });
    });

    it('un nombre que parece una fórmula no se ejecuta en la planilla', async () => {
      const usuario = await registrar('=SUMA(1;1)');

      const res = await api()
        .get(`/api/v1/actividad/exportar?dni=${usuario.dni}`)
        .set('Authorization', bearerSupervisor)
        .expect(200);

      expect(res.text).toContain(`"'=SUMA(1;1)"`);
      expect(res.text).not.toContain(`,"=SUMA`);
    });
  });
});
