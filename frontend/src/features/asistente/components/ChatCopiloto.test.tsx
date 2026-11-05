// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorAsistente, consultarAsistente } from '../api/asistente.api';
import { MENSAJE_CANCELADO, MENSAJE_NO_DISPONIBLE } from '../lib/errores';
import type { PasoRazonamiento, RespuestaAsistente } from '../types';
import { ChatCopiloto } from './ChatCopiloto';

vi.mock('../api/asistente.api', async (original) => ({
  ...(await original<typeof import('../api/asistente.api')>()),
  consultarAsistente: vi.fn(),
}));

const consultar = vi.mocked(consultarAsistente);

const PASO: PasoRazonamiento = {
  id: 'p1',
  accion: 'consulta_datos',
  descripcion: 'Total de depósitos del libro banco',
  fuentes: ['libro banco'],
  estado: 'completado',
  resultado: 'Encontré 1 registro',
  cantidadRegistros: 1,
  duracionMs: 12,
  parcial: false,
};

const RESPUESTA: RespuestaAsistente = {
  respuesta: 'Se depositaron **$ 1.231.900,10**.',
  organismoId: 7,
  pasos: [PASO],
};

function renderChat(
  ids: { organismoId?: number; cuentaMensualId?: number } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ChatCopiloto {...ids} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const campo = () =>
  screen.getByLabelText('Pregunta para el copiloto') as HTMLTextAreaElement;
const enviar = () =>
  screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement;
const panel = () =>
  screen.getByRole('complementary', { name: 'Razonamiento de la IA' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChatCopiloto', () => {
  it('sin mensajes explica los límites y ofrece preguntas sugeridas de la rendición', () => {
    renderChat({ organismoId: 7, cuentaMensualId: 42 });
    expect(screen.getByText(/no recuerda las anteriores/)).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: /observaciones abiertas tiene esta rendición/,
      }),
    ).toBeTruthy();
  });

  it('envía la pregunta con los ids y muestra la respuesta; los pasos van al panel y no al hilo', async () => {
    consultar.mockResolvedValue(RESPUESTA);
    const user = renderChat({ organismoId: 7, cuentaMensualId: 42 });

    await user.type(campo(), '  ¿Cuánto se depositó?  ');
    await user.click(enviar());

    expect(consultar).toHaveBeenCalledWith(
      { pregunta: '¿Cuánto se depositó?', organismoId: 7, cuentaMensualId: 42 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      await screen.findByText('$ 1.231.900,10', { exact: false }),
    ).toBeTruthy();
    expect(screen.getByText('¿Cuánto se depositó?')).toBeTruthy();
    expect(campo().value).toBe('');

    expect(panel().textContent).toContain('Total de depósitos del libro banco');
    expect(panel().textContent).toContain('Para: ¿Cuánto se depositó?');
    expect(screen.getByRole('log').textContent).not.toContain(
      'Total de depósitos del libro banco',
    );
    expect(
      screen
        .getByRole('button', { name: /ver razonamiento · 1 paso/i })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('muestra los pasos en vivo, en el panel y en el aviso del hilo, mientras la IA trabaja', async () => {
    let resolver!: (r: RespuestaAsistente) => void;
    consultar.mockImplementation((_consulta, opciones) => {
      opciones?.onEvento?.({
        tipo: 'paso',
        paso: { ...PASO, estado: 'en_curso', resultado: null },
      });
      return new Promise((ok) => (resolver = ok));
    });
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Hola{Enter}');

    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'Consultando: Total de depósitos del libro banco',
    );
    expect(panel().textContent).toContain('En curso');

    resolver(RESPUESTA);
    await screen.findByRole('button', { name: /ver razonamiento/i });
    expect(panel().textContent).toContain('Encontré 1 registro');
    expect(panel().textContent).not.toContain('En curso');
  });

  it('mientras consulta bloquea el campo y cambia Enviar por Detener', async () => {
    let resolver!: (r: RespuestaAsistente) => void;
    consultar.mockReturnValue(new Promise((ok) => (resolver = ok)));
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Hola');
    await user.click(enviar());

    expect(await screen.findByRole('status')).toBeTruthy();
    expect(campo().readOnly).toBe(true);
    expect(screen.queryByRole('button', { name: 'Enviar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Detener' })).toBeTruthy();

    resolver({ ...RESPUESTA, pasos: [] });
    await waitFor(() => expect(campo().readOnly).toBe(false));
    expect(screen.queryByRole('status')).toBeNull();
    expect(enviar()).toBeTruthy();
  });

  it('Detener aborta la consulta y deja un aviso con la opción de reintentar', async () => {
    let senal!: AbortSignal;
    consultar.mockImplementation(
      (_consulta, opciones) =>
        new Promise((_ok, no) => {
          senal = opciones!.signal!;
          senal.addEventListener('abort', () =>
            no(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Hola{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Detener' }));

    expect(senal.aborted).toBe(true);
    expect((await screen.findByRole('alert')).textContent).toContain(
      MENSAJE_CANCELADO,
    );
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeTruthy();
    expect(enviar()).toBeTruthy();
  });

  it('al desmontar aborta la consulta en curso', async () => {
    let senal!: AbortSignal;
    consultar.mockImplementation((_consulta, opciones) => {
      senal = opciones!.signal!;
      return new Promise(() => {});
    });
    const user = renderChat({ organismoId: 7 });
    await user.type(campo(), 'Hola{Enter}');
    await screen.findByRole('status');

    act(() => cleanup());
    expect(senal.aborted).toBe(true);
  });

  it('no envía una pregunta vacía o de solo espacios', async () => {
    const user = renderChat({ organismoId: 7 });
    expect(enviar().disabled).toBe(true);
    await user.type(campo(), '   {Enter}');
    expect(consultar).not.toHaveBeenCalled();
  });

  it('Enter envía y Mayús+Enter agrega una línea', async () => {
    consultar.mockResolvedValue({ ...RESPUESTA, pasos: [] });
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'uno{Shift>}{Enter}{/Shift}dos');
    expect(consultar).not.toHaveBeenCalled();
    expect(campo().value).toBe('uno\ndos');

    await user.keyboard('{Enter}');
    expect(consultar).toHaveBeenCalledWith(
      expect.objectContaining({ pregunta: 'uno\ndos' }),
      expect.anything(),
    );
  });

  it('una pregunta sugerida se envía con un clic', async () => {
    consultar.mockResolvedValue({ ...RESPUESTA, pasos: [] });
    const user = renderChat({ organismoId: 7 });

    await user.click(
      screen.getByRole('button', { name: /estado está cada rendición/ }),
    );
    expect(consultar).toHaveBeenCalledWith(
      {
        pregunta: '¿En qué estado está cada rendición de este organismo?',
        organismoId: 7,
        cuentaMensualId: undefined,
      },
      expect.anything(),
    );
  });

  it('ante un 502 muestra un aviso amistoso y permite reintentar sin duplicar la pregunta', async () => {
    consultar.mockRejectedValueOnce(
      new ErrorAsistente('El asistente no está disponible.', 502),
    );
    consultar.mockResolvedValueOnce({ ...RESPUESTA, pasos: [] });
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Hola{Enter}');
    expect((await screen.findByRole('alert')).textContent).toContain(
      MENSAJE_NO_DISPONIBLE,
    );

    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText(/Se depositaron/)).toBeTruthy();
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByText('Hola')).toHaveLength(1);
  });

  it('un error del flujo muestra el aviso que mandó el servidor', async () => {
    consultar.mockRejectedValue(new ErrorAsistente('Algo salió mal.'));
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Hola{Enter}');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Algo salió mal.',
    );
  });

  it('elegir otra respuesta cambia lo que muestra el panel', async () => {
    const otra: RespuestaAsistente = {
      ...RESPUESTA,
      respuesta: 'Segunda respuesta',
      pasos: [{ ...PASO, id: 'p2', descripcion: 'Observaciones abiertas' }],
    };
    consultar.mockResolvedValueOnce(RESPUESTA).mockResolvedValueOnce(otra);
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Primera{Enter}');
    await screen.findByText(/Se depositaron/);
    await user.type(campo(), 'Segunda{Enter}');
    await screen.findByText('Segunda respuesta');

    expect(panel().textContent).toContain('Observaciones abiertas');

    const botones = screen.getAllByRole('button', {
      name: /ver razonamiento/i,
    });
    await user.click(botones[0]);
    expect(panel().textContent).toContain('Total de depósitos del libro banco');
    expect(panel().textContent).toContain('Para: Primera');
  });

  it('Limpiar pide confirmación y vacía la conversación', async () => {
    consultar.mockResolvedValue({ ...RESPUESTA, pasos: [] });
    const user = renderChat({ organismoId: 7 });

    await user.type(campo(), 'Hola{Enter}');
    await screen.findByText(/Se depositaron/);

    await user.click(screen.getByRole('button', { name: /limpiar/i }));
    await user.click(await screen.findByRole('button', { name: 'Limpiar' }));

    await waitFor(() =>
      expect(screen.queryByText(/Se depositaron/)).toBeNull(),
    );
    expect(screen.getByText('¿Qué quiere consultar?')).toBeTruthy();
  });
});
