import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_SIN_LIBRO,
  asignarAuditor,
  crearAuditorConSesion,
  crearResponsableConSesion,
  obtenerBearerAdmin,
  obtenerOrganismoAjenoId,
  obtenerOrganismoBaseId,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

const CLAVE_IA = 'e2e-clave-del-servicio-de-ia-0123456789abcdef';

interface PeticionRecibida {
  headers: IncomingHttpHeaders;
  cuerpo: Record<string, unknown>;
}

//Corre contra la base real y NO limpia lo que crea. El servicio de IA es un servidor local falso: se prueba la
//frontera de confianza del backend (quién puede preguntar por qué organismo y qué se le manda a la IA), no el modelo.
//Solo lee: la rendición del mes 12 (reservado, nunca recibe un libro) sirve para anclar la consulta.
describe('Asistente de IA (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ia: Server;
  let organismoId: number;
  let organismoAjenoId: number;
  let auditor: { bearer: string; usuarioId: number };
  let recibidas: PeticionRecibida[];
  let respuestaIA: { status: number; cuerpo: unknown };

  const api = () => request(app.getHttpServer());
  const consultar = (
    cuerpo: unknown,
    bearer: string | null = auditor.bearer,
  ) => {
    const peticion = api().post('/api/v1/asistente/consultas');
    return (bearer ? peticion.set('Authorization', bearer) : peticion).send(
      cuerpo as object,
    );
  };
  const ultimoEvento = async (usuarioId: number) => {
    const [evento] = await dataSource.query(
      `SELECT * FROM registro_actividad WHERE accion = 'CONSULTA_IA' AND usuario_id = $1 ORDER BY id DESC LIMIT 1`,
      [usuarioId],
    );
    return evento;
  };

  beforeAll(async () => {
    ia = createServer((req, res) => {
      const trozos: Buffer[] = [];
      req.on('data', (t: Buffer) => trozos.push(t));
      req.on('end', () => {
        recibidas.push({
          headers: req.headers,
          cuerpo: JSON.parse(Buffer.concat(trozos).toString()),
        });
        res.writeHead(respuestaIA.status, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(respuestaIA.cuerpo));
      });
    });
    await new Promise<void>((ok) => ia.listen(0, '127.0.0.1', ok));
    //la config del asistente se lee al crear la app: las variables tienen que estar antes
    process.env.IA_SERVICE_URL = `http://127.0.0.1:${(ia.address() as AddressInfo).port}`;
    process.env.IA_SERVICE_API_KEY = CLAVE_IA;
    process.env.IA_SERVICE_TIMEOUT_MS = '5000';

    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoBaseId(dataSource);
    organismoAjenoId = await obtenerOrganismoAjenoId(dataSource);
    auditor = await crearAuditorConSesion(app, organismoId);
  });

  afterAll(async () => {
    await app.close();
    await new Promise((ok) => ia.close(ok));
    delete process.env.IA_SERVICE_URL;
    delete process.env.IA_SERVICE_API_KEY;
    delete process.env.IA_SERVICE_TIMEOUT_MS;
  });

  beforeEach(() => {
    recibidas = [];
    respuestaIA = {
      status: 200,
      cuerpo: { respuesta: 'Respuesta del servicio falso' },
    };
  });

  describe('acceso', () => {
    it('sin token → 401 y la IA no se llama', async () => {
      await consultar({ pregunta: 'hola', organismoId }, null).expect(401);
      expect(recibidas).toEqual([]);
    });

    it('un RESPONSABLE no puede usar el asistente (403)', async () => {
      const responsable = await crearResponsableConSesion(app, organismoId);

      await consultar(
        { pregunta: 'hola', organismoId },
        responsable.bearer,
      ).expect(403);
      expect(recibidas).toEqual([]);
    });

    it('un auditor no puede consultar un organismo que no tiene asignado (403) y queda DENEGADO en la bitácora', async () => {
      const respuesta = await consultar({
        pregunta: 'Pregunta que no debe llegar',
        organismoId: organismoAjenoId,
      }).expect(403);

      expect(respuesta.body.message).toContain('asignados');
      expect(recibidas).toEqual([]);
      expect(await ultimoEvento(auditor.usuarioId)).toMatchObject({
        resultado: 'DENEGADO',
        codigo_http: 403,
        organismo_id: organismoAjenoId,
      });
    });

    it('un ADMIN consulta cualquier organismo existente; si no existe, 404', async () => {
      const admin = await obtenerBearerAdmin(app);

      await consultar(
        { pregunta: 'hola', organismoId: organismoAjenoId },
        admin,
      ).expect(200);
      expect(recibidas[0]?.cuerpo.organismo_id).toBe(organismoAjenoId);

      await consultar(
        { pregunta: 'hola', organismoId: ID_INEXISTENTE },
        admin,
      ).expect(404);
    });
  });

  describe('consulta del auditor asignado', () => {
    it('responde 200 y la IA recibe la API key, el organismo y sus metadatos', async () => {
      const respuesta = await consultar({
        pregunta: '¿Cuánto se depositó en febrero?',
        organismoId,
      }).expect(200);

      expect(respuesta.body).toEqual({
        respuesta: 'Respuesta del servicio falso',
        organismoId,
      });
      expect(recibidas).toHaveLength(1);
      expect(recibidas[0]?.headers['x-api-key']).toBe(CLAVE_IA);
      expect(recibidas[0]?.cuerpo).toEqual({
        pregunta: '¿Cuánto se depositó en febrero?',
        organismo_id: organismoId,
        metadatos_organismo: {
          nombre: '__E2E__ Organismo Base',
          rubro: 'E2E',
          activo: true,
        },
        contexto_rendicion: null,
      });
    });

    it('sin organismoId usa el único organismo asignado', async () => {
      const unico = await crearAuditorConSesion(app, organismoId);

      const respuesta = await consultar(
        { pregunta: 'hola' },
        unico.bearer,
      ).expect(200);

      expect(respuesta.body.organismoId).toBe(organismoId);
      expect(recibidas[0]?.cuerpo.organismo_id).toBe(organismoId);
    });

    it('un auditor sin organismos: la IA recibe organismo null y la respuesta no trae organismo', async () => {
      const sinOrganismo = await crearAuditorConSesion(app);

      const respuesta = await consultar(
        { pregunta: 'hola' },
        sinOrganismo.bearer,
      ).expect(200);

      expect(respuesta.body.organismoId).toBeNull();
      expect(recibidas[0]?.cuerpo).toMatchObject({
        organismo_id: null,
        metadatos_organismo: null,
      });
    });

    it('con dos organismos asignados y sin organismoId pide indicar cuál (400)', async () => {
      const dos = await crearAuditorConSesion(app);
      await asignarAuditor(app, organismoId, dos.usuarioId);
      await asignarAuditor(app, organismoAjenoId, dos.usuarioId);

      await consultar({ pregunta: 'hola' }, dos.bearer).expect(400);
      expect(recibidas).toEqual([]);

      //indicando el organismo sí puede
      await consultar(
        { pregunta: 'hola', organismoId: organismoAjenoId },
        dos.bearer,
      ).expect(200);
      //(devolvemos la asignación al auditor del resto de las pruebas)
      await asignarAuditor(app, organismoId, auditor.usuarioId);
    });
  });

  describe('anclado a una rendición', () => {
    it('manda el período a la IA sin datos personales', async () => {
      const cuentaId = await resolverCuentaMensualId(
        app,
        organismoId,
        MES_SIN_LIBRO,
      );

      await consultar({
        pregunta: 'hola',
        organismoId,
        cuentaMensualId: cuentaId,
      }).expect(200);

      expect(recibidas[0]?.cuerpo.contexto_rendicion).toMatchObject({
        cuentaMensualId: cuentaId,
        mes: MES_SIN_LIBRO,
        estado: 'EN_BORRADOR',
        presentadaPor: null,
        libros: [],
      });
      expect(JSON.stringify(recibidas[0]?.cuerpo)).not.toMatch(
        /dni|email|password/i,
      );
    });

    it('una rendición de otro organismo → 404 y la IA no se llama', async () => {
      const ajena = await resolverCuentaMensualId(
        app,
        organismoAjenoId,
        MES_SIN_LIBRO,
      );

      await consultar({
        pregunta: 'hola',
        organismoId,
        cuentaMensualId: ajena,
      }).expect(404);
      expect(recibidas).toEqual([]);
    });
  });

  describe('validación', () => {
    it.each([
      ['pregunta vacía', { pregunta: '   ', organismoId }],
      ['sin pregunta', { organismoId }],
      [
        'pregunta de más de 4000 caracteres',
        { pregunta: 'a'.repeat(4001), organismoId },
      ],
      ['organismoId no positivo', { pregunta: 'hola', organismoId: 0 }],
      ['organismoId que no es entero', { pregunta: 'hola', organismoId: 1.5 }],
      [
        'cuentaMensualId inválido',
        { pregunta: 'hola', organismoId, cuentaMensualId: -1 },
      ],
    ])('%s → 400', async (_nombre, cuerpo) => {
      await consultar(cuerpo).expect(400);
      expect(recibidas).toEqual([]);
    });
  });

  describe('fallas del servicio de IA', () => {
    it('si responde 500 → 502 con mensaje claro y sin filtrar la clave', async () => {
      respuestaIA = { status: 500, cuerpo: { detail: 'boom' } };

      const respuesta = await consultar({
        pregunta: 'hola',
        organismoId,
      }).expect(502);

      expect(respuesta.body.message).toBe(
        'El asistente no está disponible en este momento. Intente nuevamente.',
      );
      expect(JSON.stringify(respuesta.body)).not.toContain(CLAVE_IA);
      expect(await ultimoEvento(auditor.usuarioId)).toMatchObject({
        resultado: 'FALLO',
        codigo_http: 502,
      });
    });

    it('si devuelve una respuesta sin el campo `respuesta` → 502', async () => {
      respuestaIA = { status: 200, cuerpo: { otra: 'cosa' } };

      await consultar({ pregunta: 'hola', organismoId }).expect(502);
    });
  });

  describe('bitácora', () => {
    it('registra CONSULTA_IA con actor, organismo y largos, sin el texto de la pregunta ni de la respuesta', async () => {
      const pregunta = 'Pregunta con un dato sensible XYZ-123';
      await consultar({ pregunta, organismoId }).expect(200);

      const evento = await ultimoEvento(auditor.usuarioId);

      expect(evento).toMatchObject({
        accion: 'CONSULTA_IA',
        resultado: 'EXITO',
        codigo_http: 200,
        usuario_id: auditor.usuarioId,
        organismo_id: organismoId,
        entidad_tipo: 'ORGANISMO',
        entidad_id: organismoId,
      });
      expect(evento.detalle).toMatchObject({
        preguntaLongitud: pregunta.length,
        respuestaLongitud: 'Respuesta del servicio falso'.length,
      });
      expect(typeof evento.detalle.duracionMs).toBe('number');
      const crudo = JSON.stringify(evento);
      expect(crudo).not.toContain('XYZ-123');
      expect(crudo).not.toContain('Respuesta del servicio falso');
    });
  });
});
