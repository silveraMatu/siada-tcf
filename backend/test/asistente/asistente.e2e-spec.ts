import {
  createServer,
  request as peticionHttp,
  type IncomingHttpHeaders,
  type Server,
} from 'node:http';
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
  url: string | undefined;
  headers: IncomingHttpHeaders;
  cuerpo: Record<string, unknown>;
}

//lo que la IA falsa responde en `/chat/stream`: bloques SSE ya armados, que manda con una pausa mínima entre sí
interface FlujoIA {
  status: number;
  partes: string[];
  //deja la conexión abierta después del último bloque (para probar que el cliente se va)
  noCerrar?: boolean;
}

const sse = (evento: string, datos: unknown) =>
  `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;

const parsearSse = (texto: string) =>
  texto
    .split('\n\n')
    .filter((b) => b.trim().length > 0 && !b.startsWith(':'))
    .map((bloque) => {
      const evento = /^event: (.*)$/m.exec(bloque)?.[1] ?? '';
      const datos = /^data: (.*)$/m.exec(bloque)?.[1];
      return { evento, datos: datos ? JSON.parse(datos) : null };
    });

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
  let flujoIA: FlujoIA;
  //se resuelve cuando la IA falsa ve cerrarse la conexión del stream
  let conexionDelStreamCerrada: Promise<void>;
  let marcarConexionCerrada: () => void;

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
  const transmitir = (
    cuerpo: unknown,
    bearer: string | null = auditor.bearer,
  ) => {
    const peticion = api()
      .post('/api/v1/asistente/consultas/stream')
      .buffer(true)
      .parse((res, cb) => {
        let texto = '';
        res.setEncoding('utf8');
        res.on('data', (c: string) => (texto += c));
        res.on('end', () => cb(null, texto));
      });
    return (bearer ? peticion.set('Authorization', bearer) : peticion).send(
      cuerpo as object,
    );
  };
  const cantidadEventos = async (usuarioId: number): Promise<number> => {
    const [fila] = await dataSource.query(
      `SELECT count(*)::int AS n FROM registro_actividad WHERE accion = 'CONSULTA_IA' AND usuario_id = $1`,
      [usuarioId],
    );
    return fila.n;
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
          url: req.url,
          headers: req.headers,
          cuerpo: JSON.parse(Buffer.concat(trozos).toString()),
        });
        if (req.url?.endsWith('/chat/stream')) {
          res.on('close', () => marcarConexionCerrada());
          if (flujoIA.status !== 200) {
            res.writeHead(flujoIA.status, {
              'Content-Type': 'application/json',
            });
            res.end('{"detail":"error"}');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.flushHeaders();
          void (async () => {
            for (const parte of flujoIA.partes) {
              res.write(parte);
              await new Promise((ok) => setTimeout(ok, 5));
            }
            if (!flujoIA.noCerrar) res.end();
          })();
          return;
        }
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
    flujoIA = {
      status: 200,
      partes: [
        sse('pensando', { mensaje: 'Analizando tu pregunta' }),
        sse('respuesta', { respuesta: 'Respuesta del servicio falso' }),
        sse('fin', {}),
      ],
    };
    conexionDelStreamCerrada = new Promise<void>(
      (ok) => (marcarConexionCerrada = ok),
    );
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
        pasos: [],
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

  const pasoServicio = {
    id: 'c1',
    accion: 'consulta_datos',
    descripcion: 'Total de depósitos del libro banco de febrero',
    fuentes: ['libro banco', 'rendiciones'],
    estado: 'completado',
    resultado: 'Encontré 1 registro',
    cantidad_registros: 1,
    duracion_ms: 15,
    parcial: false,
  };
  const pasoFallidoServicio = {
    id: 'c2',
    accion: 'consulta_datos',
    descripcion: 'Mostrar los datos de acceso de las personas',
    fuentes: [],
    estado: 'error',
    resultado: 'No pude completar este paso',
    cantidad_registros: null,
    duracion_ms: null,
    parcial: false,
  };

  describe('razonamiento del agente (respuesta completa)', () => {
    it('el auditor recibe los pasos en lenguaje natural, en orden y con los intentos fallidos', async () => {
      respuestaIA = {
        status: 200,
        cuerpo: {
          respuesta: 'Listo',
          pasos: [pasoFallidoServicio, pasoServicio],
        },
      };

      const respuesta = await consultar({
        pregunta: 'hola',
        organismoId,
      }).expect(200);

      expect(respuesta.body.pasos).toEqual([
        {
          id: 'c2',
          accion: 'consulta_datos',
          descripcion: 'Mostrar los datos de acceso de las personas',
          fuentes: [],
          estado: 'error',
          resultado: 'No pude completar este paso',
          cantidadRegistros: null,
          duracionMs: null,
          parcial: false,
        },
        {
          id: 'c1',
          accion: 'consulta_datos',
          descripcion: 'Total de depósitos del libro banco de febrero',
          fuentes: ['libro banco', 'rendiciones'],
          estado: 'completado',
          resultado: 'Encontré 1 registro',
          cantidadRegistros: 1,
          duracionMs: 15,
          parcial: false,
        },
      ]);
      //nada técnico en lo que ve el auditor
      expect(JSON.stringify(respuesta.body)).not.toMatch(
        /querySql|columnas|filas|SELECT/i,
      );
    });

    it('la bitácora guarda solo cuántas consultas hubo y cuántas fallaron, nunca los textos', async () => {
      respuestaIA = {
        status: 200,
        cuerpo: {
          respuesta: 'Listo',
          pasos: [pasoFallidoServicio, pasoServicio],
        },
      };
      await consultar({ pregunta: 'hola', organismoId }).expect(200);

      const evento = await ultimoEvento(auditor.usuarioId);

      expect(evento.detalle).toMatchObject({
        consultasSql: 2,
        consultasConError: 1,
      });
      const crudo = JSON.stringify(evento);
      expect(crudo).not.toContain('libro banco');
      expect(crudo).not.toContain('datos de acceso');
    });

    it('si un paso llega mal formado → 502 (la traza no se pierde en silencio)', async () => {
      respuestaIA = {
        status: 200,
        cuerpo: { respuesta: 'Listo', pasos: [{ accion: 'consulta_datos' }] },
      };

      await consultar({ pregunta: 'hola', organismoId }).expect(502);
    });
  });

  describe('consulta en vivo (SSE)', () => {
    it('responde text/event-stream con los eventos en orden, la respuesta con su organismo y `fin` al final', async () => {
      flujoIA.partes = [
        sse('pensando', { mensaje: 'Analizando tu pregunta' }),
        ': keepalive\n\n',
        sse('paso', {
          ...pasoServicio,
          estado: 'en_curso',
          resultado: null,
          cantidad_registros: null,
          duracion_ms: null,
        }),
        sse('paso', pasoServicio),
        sse('pensando', { mensaje: 'Analizando los resultados' }),
        sse('respuesta', { respuesta: 'Se depositaron $1.231.900,10' }),
        sse('fin', {}),
      ];

      const respuesta = await transmitir({
        pregunta: '¿Cuánto se depositó?',
        organismoId,
      }).expect(200);

      expect(respuesta.headers['content-type']).toMatch(/text\/event-stream/);
      expect(respuesta.headers['cache-control']).toBe('no-cache');
      const eventos = parsearSse(respuesta.body as string);
      expect(eventos.map((e) => e.evento)).toEqual([
        'pensando',
        'paso',
        'paso',
        'pensando',
        'respuesta',
        'fin',
      ]);
      expect(eventos[1]?.datos).toMatchObject({
        id: 'c1',
        estado: 'en_curso',
        resultado: null,
        cantidadRegistros: null,
      });
      expect(eventos[2]?.datos).toMatchObject({
        id: 'c1',
        estado: 'completado',
        resultado: 'Encontré 1 registro',
        cantidadRegistros: 1,
        duracionMs: 15,
        fuentes: ['libro banco', 'rendiciones'],
      });
      expect(eventos[4]?.datos).toEqual({
        respuesta: 'Se depositaron $1.231.900,10',
        organismoId,
      });
      //el keepalive del servicio no llega al cliente
      expect(respuesta.body).not.toContain('keepalive');
    });

    it('a la IA le llega la ruta del stream, la API key y el contexto del organismo', async () => {
      await transmitir({ pregunta: 'hola', organismoId }).expect(200);

      expect(recibidas).toHaveLength(1);
      expect(recibidas[0]?.url).toBe('/api/v1/agent/chat/stream');
      expect(recibidas[0]?.headers['x-api-key']).toBe(CLAVE_IA);
      expect(recibidas[0]?.cuerpo).toMatchObject({
        organismo_id: organismoId,
        metadatos_organismo: { nombre: '__E2E__ Organismo Base' },
      });
    });

    it('la bitácora ya tiene el evento (uno solo) cuando el cliente termina de leer, con cantidades y sin textos', async () => {
      flujoIA.partes = [
        sse('paso', pasoServicio),
        sse('paso', pasoFallidoServicio),
        sse('respuesta', { respuesta: 'Listo' }),
        sse('fin', {}),
      ];
      const antes = await cantidadEventos(auditor.usuarioId);

      await transmitir({ pregunta: 'hola', organismoId }).expect(200);

      expect(await cantidadEventos(auditor.usuarioId)).toBe(antes + 1);
      const evento = await ultimoEvento(auditor.usuarioId);
      expect(evento).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 200,
        organismo_id: organismoId,
      });
      expect(evento.detalle).toMatchObject({
        consultasSql: 2,
        consultasConError: 1,
        respuestaLongitud: 'Listo'.length,
      });
      expect(JSON.stringify(evento)).not.toContain('libro banco');
    });

    describe('errores previos al flujo: códigos HTTP normales', () => {
      it('sin token → 401', async () => {
        await transmitir({ pregunta: 'hola', organismoId }, null).expect(401);
        expect(recibidas).toEqual([]);
      });

      it('un RESPONSABLE → 403', async () => {
        const responsable = await crearResponsableConSesion(app, organismoId);

        await transmitir(
          { pregunta: 'hola', organismoId },
          responsable.bearer,
        ).expect(403);
        expect(recibidas).toEqual([]);
      });

      it('un auditor sin ese organismo → 403 (JSON, no flujo) y queda DENEGADO', async () => {
        const respuesta = await transmitir({
          pregunta: 'hola',
          organismoId: organismoAjenoId,
        }).expect(403);

        expect(respuesta.headers['content-type']).toMatch(/json/);
        expect(recibidas).toEqual([]);
        expect(await ultimoEvento(auditor.usuarioId)).toMatchObject({
          resultado: 'DENEGADO',
          codigo_http: 403,
        });
      });

      it('organismo inexistente (ADMIN) → 404; pregunta vacía → 400', async () => {
        const admin = await obtenerBearerAdmin(app);

        await transmitir(
          { pregunta: 'hola', organismoId: ID_INEXISTENTE },
          admin,
        ).expect(404);
        await transmitir({ pregunta: '   ', organismoId }).expect(400);
        expect(recibidas).toEqual([]);
      });

      it('el servicio de IA rechaza el pedido → 502 normal (no se abre el flujo) y FALLO en la bitácora', async () => {
        flujoIA = { status: 500, partes: [] };

        const respuesta = await transmitir({
          pregunta: 'hola',
          organismoId,
        }).expect(502);

        expect(respuesta.headers['content-type']).toMatch(/json/);
        expect(await ultimoEvento(auditor.usuarioId)).toMatchObject({
          resultado: 'FALLO',
          codigo_http: 502,
        });
      });
    });

    describe('fallas durante el flujo', () => {
      it('un evento `error` del servicio llega como evento `error` al cliente y queda FALLO 502', async () => {
        flujoIA.partes = [
          sse('pensando', { mensaje: 'Analizando tu pregunta' }),
          sse('error', { mensaje: 'detalle interno del servicio' }),
        ];

        const respuesta = await transmitir({
          pregunta: 'hola',
          organismoId,
        }).expect(200);

        const eventos = parsearSse(respuesta.body as string);
        expect(eventos.map((e) => e.evento)).toEqual(['pensando', 'error']);
        expect(eventos[1]?.datos).toEqual({
          mensaje:
            'El asistente no está disponible en este momento. Intente nuevamente.',
        });
        //el detalle interno del servicio no sale
        expect(respuesta.body).not.toContain('detalle interno');
        expect(await ultimoEvento(auditor.usuarioId)).toMatchObject({
          resultado: 'FALLO',
          codigo_http: 502,
        });
      });

      it('si el servicio corta sin mandar `fin` también llega un evento `error`', async () => {
        flujoIA.partes = [sse('pensando', { mensaje: 'Hola' })];

        const respuesta = await transmitir({
          pregunta: 'hola',
          organismoId,
        }).expect(200);

        expect(
          parsearSse(respuesta.body as string).map((e) => e.evento),
        ).toEqual(['pensando', 'error']);
      });
    });

    it('si el cliente se va, se corta la llamada al servicio de IA y la bitácora lo registra como cancelada', async () => {
      flujoIA = {
        status: 200,
        partes: [sse('pensando', { mensaje: 'Analizando tu pregunta' })],
        noCerrar: true, //el agente "sigue pensando" hasta que lo corten
      };
      const puerto = (app.getHttpServer().address() as AddressInfo).port;
      const cuerpo = JSON.stringify({ pregunta: 'hola', organismoId });
      const antes = await cantidadEventos(auditor.usuarioId);

      await new Promise<void>((resolver, rechazar) => {
        const pedido = peticionHttp(
          {
            host: '127.0.0.1',
            port: puerto,
            path: '/api/v1/asistente/consultas/stream',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(cuerpo),
              Authorization: auditor.bearer,
            },
          },
          (res) => {
            res.once('data', () => {
              pedido.destroy(); //el cliente se va después del primer evento
              resolver();
            });
          },
        );
        pedido.on('error', () => undefined);
        pedido.setTimeout(5000, () => rechazar(new Error('sin eventos')));
        pedido.end(cuerpo);
      });

      await Promise.race([
        conexionDelStreamCerrada,
        new Promise((_, rechazar) =>
          setTimeout(() => rechazar(new Error('la IA no vio el corte')), 3000),
        ),
      ]);
      //la bitácora se escribe un instante después de que el backend nota el corte
      let evento: unknown;
      for (let i = 0; i < 20; i++) {
        if ((await cantidadEventos(auditor.usuarioId)) > antes) {
          evento = await ultimoEvento(auditor.usuarioId);
          break;
        }
        await new Promise((ok) => setTimeout(ok, 100));
      }
      expect(evento).toMatchObject({ resultado: 'FALLO', codigo_http: 499 });
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
