import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  AsistenteNoConfiguradoError,
  AsistenteNoDisponibleError,
} from '../../../../domain/errors/asistente.errors.js';
import type {
  ConsultaIA,
  EventoIA,
} from '../../../../application/ports/out/asistente-ia.port.js';
import { HttpAsistenteIAAdapter } from './http-asistente-ia.adapter.js';

const CLAVE = 'clave-secreta-del-servicio-de-ia-0123456789';

const consulta: ConsultaIA = {
  pregunta: '¿Cuánto se depositó?',
  organismoId: 1,
  metadatosOrganismo: { nombre: 'Demo' },
  contextoRendicion: null,
};

describe('HttpAsistenteIAAdapter', () => {
  let servidor: Server;
  let url: string;
  let recibido: {
    headers: IncomingHttpHeaders;
    metodo?: string;
    ruta?: string;
    cuerpo: unknown;
  } | null;
  let responder: (cuerpo: string) => {
    status: number;
    cuerpo: string;
    demoraMs?: number;
  };

  beforeAll(async () => {
    servidor = createServer((req, res) => {
      const trozos: Buffer[] = [];
      req.on('data', (t: Buffer) => trozos.push(t));
      req.on('end', () => {
        const texto = Buffer.concat(trozos).toString();
        recibido = {
          headers: req.headers,
          metodo: req.method,
          ruta: req.url,
          cuerpo: JSON.parse(texto),
        };
        const { status, cuerpo, demoraMs } = responder(texto);
        setTimeout(() => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(cuerpo);
        }, demoraMs ?? 0);
      });
    });
    await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((ok) => servidor.close(ok));
  });

  beforeEach(() => {
    recibido = null;
    responder = () => ({
      status: 200,
      cuerpo: JSON.stringify({ respuesta: 'Listo' }),
    });
  });

  const adaptador = (
    config: Partial<{
      url: string | null;
      apiKey: string | null;
      timeoutMs: number;
    }> = {},
  ) =>
    new HttpAsistenteIAAdapter({
      url,
      apiKey: CLAVE,
      timeoutMs: 2000,
      ...config,
    });

  it('manda la API key y el cuerpo en snake_case a la ruta del chat y devuelve la respuesta', async () => {
    const respuesta = await adaptador().consultar(consulta);

    expect(respuesta).toEqual({ respuesta: 'Listo', pasos: [] });
    expect(recibido?.metodo).toBe('POST');
    expect(recibido?.ruta).toBe('/api/v1/agent/chat');
    expect(recibido?.headers['x-api-key']).toBe(CLAVE);
    expect(recibido?.cuerpo).toEqual({
      pregunta: '¿Cuánto se depositó?',
      organismo_id: 1,
      metadatos_organismo: { nombre: 'Demo' },
      contexto_rendicion: null,
    });
  });

  it('sin URL o sin clave lanza AsistenteNoConfiguradoError sin llamar a nadie', async () => {
    await expect(
      adaptador({ url: null }).consultar(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoConfiguradoError);
    await expect(
      adaptador({ apiKey: null }).consultar(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoConfiguradoError);
    expect(recibido).toBeNull();
  });

  it.each([401, 422, 500, 502])(
    'si el servicio responde %i lanza AsistenteNoDisponibleError sin filtrar la clave',
    async (status) => {
      responder = () => ({ status, cuerpo: JSON.stringify({ detail: 'x' }) });

      const error = await adaptador()
        .consultar(consulta)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AsistenteNoDisponibleError);
      expect(String((error as Error).message)).not.toContain(CLAVE);
    },
  );

  it('una respuesta que no es JSON o no trae `respuesta` es AsistenteNoDisponibleError', async () => {
    responder = () => ({ status: 200, cuerpo: 'no es json' });
    await expect(adaptador().consultar(consulta)).rejects.toBeInstanceOf(
      AsistenteNoDisponibleError,
    );

    responder = () => ({
      status: 200,
      cuerpo: JSON.stringify({ otra: 'cosa' }),
    });
    await expect(adaptador().consultar(consulta)).rejects.toBeInstanceOf(
      AsistenteNoDisponibleError,
    );
  });

  it('si el servicio tarda más que el timeout lanza AsistenteNoDisponibleError', async () => {
    responder = () => ({
      status: 200,
      cuerpo: JSON.stringify({ respuesta: 'tarde' }),
      demoraMs: 600,
    });
    await expect(
      adaptador({ timeoutMs: 100 }).consultar(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoDisponibleError);
  });

  it('si no se puede conectar lanza AsistenteNoDisponibleError', async () => {
    await expect(
      adaptador({ url: 'http://127.0.0.1:1' }).consultar(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoDisponibleError);
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
  duracion_ms: 7,
  parcial: false,
};

const sse = (evento: string, datos: unknown) =>
  `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;

describe('HttpAsistenteIAAdapter: razonamiento en la respuesta completa', () => {
  let servidor: Server;
  let url: string;
  let cuerpoRespuesta: unknown;

  beforeAll(async () => {
    servidor = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cuerpoRespuesta));
      });
    });
    await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((ok) => servidor.close(ok));
  });

  const consultar = () =>
    new HttpAsistenteIAAdapter({
      url,
      apiKey: CLAVE,
      timeoutMs: 2000,
    }).consultar(consulta);

  it('traduce los pasos de snake_case a camelCase', async () => {
    cuerpoRespuesta = { respuesta: 'Listo', pasos: [pasoServicio] };

    expect((await consultar()).pasos).toEqual([
      {
        id: 'c1',
        accion: 'consulta_datos',
        descripcion: 'Total de depósitos del libro banco de febrero',
        fuentes: ['libro banco', 'rendiciones'],
        estado: 'completado',
        resultado: 'Encontré 1 registro',
        cantidadRegistros: 1,
        duracionMs: 7,
        parcial: false,
      },
    ]);
  });

  it('un paso fallido llega con duración y cantidad nulas', async () => {
    cuerpoRespuesta = {
      respuesta: 'No puedo',
      pasos: [
        {
          id: 'c2',
          accion: 'consulta_datos',
          descripcion: 'Consultando los datos del organismo',
          estado: 'error',
          resultado: 'No pude completar este paso',
        },
      ],
    };

    expect((await consultar()).pasos[0]).toMatchObject({
      estado: 'error',
      fuentes: [],
      cantidadRegistros: null,
      duracionMs: null,
      parcial: false,
    });
  });

  it('un servicio que no manda `pasos` (versión anterior) da una lista vacía', async () => {
    cuerpoRespuesta = { respuesta: 'Listo' };

    expect((await consultar()).pasos).toEqual([]);
  });

  it('un paso mal formado es AsistenteNoDisponibleError: la traza no se degrada en silencio', async () => {
    cuerpoRespuesta = {
      respuesta: 'Listo',
      pasos: [{ accion: 'consulta_datos' }],
    };

    await expect(consultar()).rejects.toBeInstanceOf(
      AsistenteNoDisponibleError,
    );
  });
});

type Guion = (string | { esperarMs: number })[];

describe('HttpAsistenteIAAdapter: consulta en vivo (SSE)', () => {
  let servidor: Server;
  let url: string;
  let guion: Guion;
  let status: number;
  let cerrarAlTerminar: boolean;
  let ruta: string | undefined;
  let claveRecibida: string | string[] | undefined;
  let conexionCerrada: Promise<void>;
  let marcarCerrada: () => void;

  beforeAll(async () => {
    servidor = createServer((req, res) => {
      ruta = req.url;
      claveRecibida = req.headers['x-api-key'];
      res.on('close', () => marcarCerrada());
      req.resume();
      req.on('end', () => {
        void (async () => {
          if (status !== 200) {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end('{"detail":"x"}');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.flushHeaders();
          for (const parte of guion) {
            if (typeof parte === 'string') res.write(parte);
            else await new Promise((ok) => setTimeout(ok, parte.esperarMs));
          }
          if (cerrarAlTerminar) res.end();
        })();
      });
    });
    await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    servidor.closeAllConnections();
    await new Promise((ok) => servidor.close(ok));
  });

  beforeEach(() => {
    guion = [];
    status = 200;
    cerrarAlTerminar = true;
    ruta = undefined;
    claveRecibida = undefined;
    conexionCerrada = new Promise<void>((ok) => (marcarCerrada = ok));
  });

  const adaptador = (
    config: Partial<{
      url: string | null;
      apiKey: string | null;
      timeoutMs: number;
    }> = {},
  ) =>
    new HttpAsistenteIAAdapter({
      url,
      apiKey: CLAVE,
      timeoutMs: 2000,
      ...config,
    });

  async function leer(
    flujo: AsyncIterable<EventoIA>,
  ): Promise<{ eventos: EventoIA[]; error: unknown }> {
    const eventos: EventoIA[] = [];
    try {
      for await (const evento of flujo) eventos.push(evento);
      return { eventos, error: null };
    } catch (error) {
      return { eventos, error };
    }
  }

  it('pide la ruta del stream con la API key y entrega los eventos hasta `fin`', async () => {
    guion = [
      sse('pensando', { mensaje: 'Analizando tu pregunta' }),
      sse('paso', { ...pasoServicio, estado: 'en_curso', resultado: null }),
      sse('paso', pasoServicio),
      sse('respuesta', { respuesta: 'Listo' }),
      sse('fin', {}),
    ];

    const { eventos, error } = await leer(
      await adaptador().iniciarConsultaEnVivo(consulta),
    );

    expect(error).toBeNull();
    expect(ruta).toBe('/api/v1/agent/chat/stream');
    expect(claveRecibida).toBe(CLAVE);
    expect(eventos.map((e) => e.tipo)).toEqual([
      'pensando',
      'paso',
      'paso',
      'respuesta',
    ]);
    expect(eventos[2]).toMatchObject({
      tipo: 'paso',
      paso: { id: 'c1', cantidadRegistros: 1, duracionMs: 7 },
    });
  });

  it('arma los eventos aunque lleguen partidos en cualquier punto, con comentarios y saltos \\r\\n', async () => {
    const completo =
      sse('pensando', { mensaje: 'Hola' }) +
      ': keepalive\n\n' +
      sse('respuesta', { respuesta: 'ñandú' }).replace(/\n/g, '\r\n') +
      sse('fin', {});
    //trozos de 7 caracteres: corta nombres de evento, JSON y hasta el carácter «ñ»
    const bytes = Buffer.from(completo);
    guion = [];
    for (let i = 0; i < bytes.length; i += 7) {
      guion.push(bytes.subarray(i, i + 7).toString('latin1'));
      guion.push({ esperarMs: 1 });
    }
    //se manda por latin1 para poder cortar en medio de un carácter UTF-8: se reconstruye como bytes
    const servidorRaw = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        void (async () => {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          for (let i = 0; i < bytes.length; i += 7) {
            res.write(bytes.subarray(i, i + 7));
            await new Promise((ok) => setTimeout(ok, 1));
          }
          res.end();
        })();
      });
    });
    await new Promise<void>((ok) => servidorRaw.listen(0, '127.0.0.1', ok));
    const urlRaw = `http://127.0.0.1:${(servidorRaw.address() as AddressInfo).port}`;

    try {
      const { eventos, error } = await leer(
        await adaptador({ url: urlRaw }).iniciarConsultaEnVivo(consulta),
      );

      expect(error).toBeNull();
      expect(eventos).toEqual([
        { tipo: 'pensando', mensaje: 'Hola' },
        { tipo: 'respuesta', respuesta: 'ñandú' },
      ]);
    } finally {
      servidorRaw.closeAllConnections();
      await new Promise((ok) => servidorRaw.close(ok));
    }
  });

  it('un evento desconocido se ignora', async () => {
    guion = [
      sse('algo_nuevo', { x: 1 }),
      sse('respuesta', { respuesta: 'Listo' }),
      sse('fin', {}),
    ];

    const { eventos } = await leer(
      await adaptador().iniciarConsultaEnVivo(consulta),
    );

    expect(eventos).toEqual([{ tipo: 'respuesta', respuesta: 'Listo' }]);
  });

  it('un evento `error` entrega lo anterior y corta con AsistenteNoDisponibleError', async () => {
    guion = [
      sse('pensando', { mensaje: 'Hola' }),
      sse('error', { mensaje: 'El asistente no está disponible' }),
    ];

    const { eventos, error } = await leer(
      await adaptador().iniciarConsultaEnVivo(consulta),
    );

    expect(eventos).toHaveLength(1);
    expect(error).toBeInstanceOf(AsistenteNoDisponibleError);
  });

  it('si el servicio cierra sin mandar `fin` es AsistenteNoDisponibleError (flujo cortado)', async () => {
    guion = [sse('pensando', { mensaje: 'Hola' })];

    const { eventos, error } = await leer(
      await adaptador().iniciarConsultaEnVivo(consulta),
    );

    expect(eventos).toHaveLength(1);
    expect(error).toBeInstanceOf(AsistenteNoDisponibleError);
  });

  it.each([
    ['JSON inválido', 'event: paso\ndata: {no es json\n\n'],
    ['paso mal formado', sse('paso', { id: 'c1' })],
    ['respuesta sin texto', sse('respuesta', {})],
  ])('%s → AsistenteNoDisponibleError', async (_nombre, bloque) => {
    guion = [bloque, sse('fin', {})];

    const { error } = await leer(
      await adaptador().iniciarConsultaEnVivo(consulta),
    );

    expect(error).toBeInstanceOf(AsistenteNoDisponibleError);
  });

  it.each([401, 422, 500, 502])(
    'si el servicio responde %i falla al iniciar, antes de devolver el flujo',
    async (codigo) => {
      status = codigo;

      await expect(
        adaptador().iniciarConsultaEnVivo(consulta),
      ).rejects.toBeInstanceOf(AsistenteNoDisponibleError);
    },
  );

  it('sin URL o sin clave lanza AsistenteNoConfiguradoError al iniciar', async () => {
    await expect(
      adaptador({ url: null }).iniciarConsultaEnVivo(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoConfiguradoError);
    await expect(
      adaptador({ apiKey: null }).iniciarConsultaEnVivo(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoConfiguradoError);
  });

  it('si no se puede conectar falla al iniciar', async () => {
    await expect(
      adaptador({ url: 'http://127.0.0.1:1' }).iniciarConsultaEnVivo(consulta),
    ).rejects.toBeInstanceOf(AsistenteNoDisponibleError);
  });

  it('la señal de cancelación corta el flujo y cierra la conexión con el servicio', async () => {
    cerrarAlTerminar = false;
    guion = [sse('pensando', { mensaje: 'Hola' })];
    const cancelacion = new AbortController();
    const flujo = await adaptador({ timeoutMs: 10_000 }).iniciarConsultaEnVivo(
      consulta,
      cancelacion.signal,
    );

    const recibidos: EventoIA[] = [];
    const lectura = (async () => {
      for await (const evento of flujo) {
        recibidos.push(evento);
        cancelacion.abort(); //el cliente se fue después del primer evento
      }
    })();

    await expect(lectura).rejects.toBeInstanceOf(AsistenteNoDisponibleError);
    await conexionCerrada; //el servidor vio cerrarse la conexión: el agente deja de trabajar
    expect(recibidos).toHaveLength(1);
  });

  it('un flujo que no termina se corta por el tiempo máximo', async () => {
    cerrarAlTerminar = false;
    guion = [sse('pensando', { mensaje: 'Hola' })];

    const { eventos, error } = await leer(
      await adaptador({ timeoutMs: 150 }).iniciarConsultaEnVivo(consulta),
    );

    expect(eventos).toHaveLength(1);
    expect(error).toBeInstanceOf(AsistenteNoDisponibleError);
    await conexionCerrada;
  });
});
