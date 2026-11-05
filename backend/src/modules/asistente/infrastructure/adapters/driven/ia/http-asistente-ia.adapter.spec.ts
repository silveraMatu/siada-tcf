import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  AsistenteNoConfiguradoError,
  AsistenteNoDisponibleError,
} from '../../../../domain/errors/asistente.errors.js';
import type { ConsultaIA } from '../../../../application/ports/out/asistente-ia.port.js';
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

    expect(respuesta).toEqual({ respuesta: 'Listo' });
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
