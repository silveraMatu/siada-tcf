import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notificarSesionExpirada } from '@/lib/api';
import { getToken } from '@/lib/auth-token';
import type { EventoAsistente } from '../types';
import { ErrorAsistente, consultarAsistente } from './asistente.api';

vi.mock('@/lib/auth-token', () => ({ getToken: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api: { defaults: { baseURL: '/api/v1' } },
  notificarSesionExpirada: vi.fn(),
}));

const fetchFalso = vi.fn();

function sse(...eventos: [string, unknown][]) {
  const texto = eventos
    .map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`)
    .join('');
  return new Response(texto, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

const PASO = {
  id: 'p1',
  accion: 'consulta_datos',
  descripcion: 'Total de depósitos',
  fuentes: ['libro banco'],
  resultado: null,
  cantidadRegistros: null,
  duracionMs: null,
  parcial: false,
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso);
  vi.mocked(getToken).mockReturnValue('jwt-de-prueba');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('consultarAsistente', () => {
  it('hace POST al stream con el JWT y el cuerpo, y arma la respuesta con el estado final de cada paso', async () => {
    fetchFalso.mockResolvedValue(
      sse(
        ['pensando', { mensaje: 'Analizando tu pregunta' }],
        ['paso', { ...PASO, estado: 'en_curso' }],
        [
          'paso',
          {
            ...PASO,
            estado: 'completado',
            resultado: 'Encontré 1 registro',
            cantidadRegistros: 1,
            duracionMs: 50,
          },
        ],
        ['respuesta', { respuesta: 'Se depositaron **$ 10**', organismoId: 1 }],
        ['fin', {}],
      ),
    );
    const eventos: EventoAsistente[] = [];

    const resultado = await consultarAsistente(
      { pregunta: '¿Cuánto?', organismoId: 1, cuentaMensualId: 4 },
      { onEvento: (e) => eventos.push(e) },
    );

    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url).toBe('/api/v1/asistente/consultas/stream');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer jwt-de-prueba');
    expect(JSON.parse(opciones.body)).toEqual({
      pregunta: '¿Cuánto?',
      organismoId: 1,
      cuentaMensualId: 4,
    });

    expect(eventos.map((e) => e.tipo)).toEqual([
      'pensando',
      'paso',
      'paso',
      'respuesta',
      'fin',
    ]);
    expect(resultado.respuesta).toBe('Se depositaron **$ 10**');
    expect(resultado.organismoId).toBe(1);
    expect(resultado.pasos).toHaveLength(1);
    expect(resultado.pasos[0]).toMatchObject({
      estado: 'completado',
      cantidadRegistros: 1,
    });
  });

  it('sin token no manda Authorization', async () => {
    vi.mocked(getToken).mockReturnValue(null);
    fetchFalso.mockResolvedValue(
      sse(['respuesta', { respuesta: 'x', organismoId: null }], ['fin', {}]),
    );
    await consultarAsistente({ pregunta: 'x' });
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('un evento error corta con el mensaje del servidor y sin código HTTP', async () => {
    fetchFalso.mockResolvedValue(
      sse([
        'error',
        { mensaje: 'El asistente no está disponible en este momento.' },
      ]),
    );
    const falla = await consultarAsistente({ pregunta: 'x' }).catch((e) => e);
    expect(falla).toBeInstanceOf(ErrorAsistente);
    expect(falla.estado).toBeUndefined();
    expect(falla.message).toBe(
      'El asistente no está disponible en este momento.',
    );
  });

  it('un rechazo previo al stream conserva el código y el mensaje de Nest', async () => {
    fetchFalso.mockResolvedValue(
      Response.json(
        {
          statusCode: 403,
          message: 'El organismo no está entre los que tiene asignados.',
        },
        { status: 403 },
      ),
    );
    const falla = await consultarAsistente({ pregunta: 'x' }).catch((e) => e);
    expect(falla.estado).toBe(403);
    expect(falla.message).toBe(
      'El organismo no está entre los que tiene asignados.',
    );
  });

  it('un 400 de validación Zod usa el detalle de errors[]', async () => {
    fetchFalso.mockResolvedValue(
      Response.json(
        {
          statusCode: 400,
          errors: [{ message: 'La pregunta es obligatoria' }],
        },
        { status: 400 },
      ),
    );
    const falla = await consultarAsistente({ pregunta: '' }).catch((e) => e);
    expect(falla.message).toBe('La pregunta es obligatoria');
  });

  it('un 401 con token avisa que la sesión venció', async () => {
    fetchFalso.mockResolvedValue(
      Response.json({ statusCode: 401 }, { status: 401 }),
    );
    const falla = await consultarAsistente({ pregunta: 'x' }).catch((e) => e);
    expect(falla.estado).toBe(401);
    expect(notificarSesionExpirada).toHaveBeenCalledOnce();
  });

  it('si el flujo termina sin respuesta falla', async () => {
    fetchFalso.mockResolvedValue(
      sse(['pensando', { mensaje: 'x' }], ['fin', {}]),
    );
    await expect(consultarAsistente({ pregunta: 'x' })).rejects.toBeInstanceOf(
      ErrorAsistente,
    );
  });

  it('si se corta después de la respuesta, igual devuelve lo que llegó', async () => {
    fetchFalso.mockResolvedValue(
      sse(['respuesta', { respuesta: 'Listo', organismoId: 2 }]),
    );
    expect((await consultarAsistente({ pregunta: 'x' })).respuesta).toBe(
      'Listo',
    );
  });

  it('al abortar rechaza con AbortError y avisa al fetch', async () => {
    fetchFalso.mockImplementation(
      (_url: string, opciones: { signal: AbortSignal }) =>
        new Promise((_ok, no) => {
          opciones.signal.addEventListener('abort', () =>
            no(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const controlador = new AbortController();
    const promesa = consultarAsistente(
      { pregunta: 'x' },
      { signal: controlador.signal },
    );
    controlador.abort();
    await expect(promesa).rejects.toMatchObject({ name: 'AbortError' });
  });
});
