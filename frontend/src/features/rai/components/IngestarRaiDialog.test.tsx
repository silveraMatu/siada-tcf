// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ingestarRai } from '../api/rai.api';
import { parseRaiExcel } from '../lib/parse-rai';
import type { FilaRaiPreview, ResultadoParseoRai } from '../types';
import { IngestarRaiDialog } from './IngestarRaiDialog';

vi.mock('../api/rai.api', () => ({ ingestarRai: vi.fn() }));
vi.mock('../lib/parse-rai', () => ({
  RaiParseError: class extends Error {},
  parseRaiExcel: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fila = (n: number, errores: string[] = []): FilaRaiPreview => ({
  fila: n + 18,
  transaccion: {
    fecha: `2026-09-0${n}`,
    concepto: `Ingreso ${n}`,
    ingresosDiarios: 1000,
    ingresosMensuales: 1000 * n,
    ingresosAcumulados: 5000,
    saldo: 9000,
  },
  errores,
});

// 409 con el cuerpo que arma el backend cuando la rendición ya tiene el libro
const errorLibroDuplicado = () =>
  new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: {
      statusCode: 409,
      codigo: 'LIBRO_DUPLICADO',
      message: 'Ya existe un libro RAI en esta rendición.',
      libroExistente: {
        id: 7,
        numeroCuentaCte: null,
        fechaCreacion: '2026-10-15T12:00:00.000Z',
        cantidadTransacciones: 12,
      },
    },
  } as AxiosResponse);

function renderDialogo(
  libroExistente = null as null | {
    asientos: number;
    fechaDesde: string | null;
    fechaHasta: string | null;
    cargadoEl: string;
    subidoPor: null;
  },
) {
  const onIngestada = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <IngestarRaiDialog
        open
        onOpenChange={vi.fn()}
        cuentaMensualId={5}
        ejercicioFiscal={2026}
        onIngestada={onIngestada}
        libroExistente={libroExistente}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onIngestada };
}

async function subirArchivo(
  user: ReturnType<typeof userEvent.setup>,
  filas: FilaRaiPreview[],
  extra: Partial<ResultadoParseoRai> = {},
  nombre = 'rai.xls',
) {
  vi.mocked(parseRaiExcel).mockResolvedValue({ filas, omitidas: 0, ...extra });
  const entrada = document.querySelector('input[type="file"]');
  await user.upload(entrada as HTMLInputElement, new File(['x'], nombre));
  await screen.findByText(nombre);
}

const botonConfirmar = () =>
  screen.getByRole('button', {
    name: /Confirmar y (subir|reemplazar)/,
  }) as HTMLButtonElement;

beforeEach(() => {
  vi.mocked(ingestarRai).mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('IngestarRaiDialog', () => {
  it('ofrece los formatos de la planilla, incluido .xls, y explica de dónde sale el año', () => {
    renderDialogo();
    const entrada = document.querySelector('input[type="file"]');
    expect(entrada?.getAttribute('accept')).toBe('.xls,.xlsx,.csv');
    expect(screen.getByText(/ejercicio 2026 de la rendición/)).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);
  });

  it('lee el archivo con el ejercicio de la rendición', async () => {
    const { user } = renderDialogo();
    await subirArchivo(user, [fila(1)]);

    expect(parseRaiExcel).toHaveBeenCalledWith(expect.any(File), 2026);
  });

  it('muestra la vista previa con los asientos y las filas omitidas', async () => {
    const { user } = renderDialogo();

    await subirArchivo(user, [fila(1), fila(2)], { omitidas: 19 });

    expect(screen.getByText(/2 asientos/)).toBeTruthy();
    expect(
      screen.getByText(/19 filas omitidas \(transporte o sin usar\)/),
    ).toBeTruthy();
    expect(screen.getByText('Ingreso 1')).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(false);
  });

  it('si el encabezado indica otro ejercicio avisa, pero deja enviar', async () => {
    const { user } = renderDialogo();

    await subirArchivo(user, [fila(1)], { ejercicioDeLaPlanilla: 2025 });

    expect(
      screen.getByText(
        /La planilla indica el ejercicio 2025 y esta rendición es del 2026/,
      ),
    ).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(false);
  });

  it('si el ejercicio de la planilla coincide, o no se conoce, no avisa nada', async () => {
    const { user } = renderDialogo();
    await subirArchivo(user, [fila(1)], { ejercicioDeLaPlanilla: 2026 });
    expect(screen.queryByText(/La planilla indica el ejercicio/)).toBeNull();
  });

  it('envía solo los asientos, sin la fila de la planilla, y avisa al terminar', async () => {
    const { user, onIngestada } = renderDialogo();
    await subirArchivo(user, [fila(1), fila(2)]);

    await user.click(botonConfirmar());

    await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
    const [cuentaId, payload] = vi.mocked(ingestarRai).mock.calls[0];
    expect(cuentaId).toBe(5);
    expect(payload.transacciones.map((t) => t.concepto)).toEqual([
      'Ingreso 1',
      'Ingreso 2',
    ]);
    expect(payload.transacciones[0]).not.toHaveProperty('fila');
    expect(payload.transacciones[0]).not.toHaveProperty('partida');
    expect(payload.reemplazar).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });

  it('con asientos con errores avisa y no permite enviar', async () => {
    const { user } = renderDialogo();
    await subirArchivo(user, [fila(1), fila(2, ['El día es obligatorio'])]);

    expect(screen.getByText(/1 asiento tiene errores/)).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);
    expect(ingestarRai).not.toHaveBeenCalled();
  });

  it('rechaza un formato no admitido sin leerlo', async () => {
    renderDialogo();
    // el input filtra por `accept`: se desactiva para simular que el archivo llega igual (arrastrado)
    const user = userEvent.setup({ applyAccept: false });
    const entrada = document.querySelector('input[type="file"]');

    await user.upload(entrada as HTMLInputElement, new File(['x'], 'rai.pdf'));

    expect(await screen.findByText(/Formato no admitido/)).toBeTruthy();
    expect(parseRaiExcel).not.toHaveBeenCalled();
  });

  it('con un libro ya cargado es un reemplazo desde el inicio', async () => {
    const { user, onIngestada } = renderDialogo({
      asientos: 12,
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-30',
      cargadoEl: '2026-10-15T12:00:00.000Z',
      subidoPor: null,
    });
    expect(
      screen.getByText(/Ya hay un RAI cargado \(12 asientos/),
    ).toBeTruthy();

    await subirArchivo(user, [fila(1)]);
    await user.click(
      screen.getByRole('button', { name: 'Confirmar y reemplazar' }),
    );

    await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
    expect(vi.mocked(ingestarRai).mock.calls[0][1]).toMatchObject({
      reemplazar: true,
    });
  });

  describe('libro ya cargado detectado por el servidor (409)', () => {
    it('ofrece reemplazar y reenvía con reemplazar: true', async () => {
      vi.mocked(ingestarRai).mockRejectedValueOnce(errorLibroDuplicado());
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, [fila(1)]);

      await user.click(botonConfirmar());
      expect(
        await screen.findByText(/Ya hay un RAI en esta rendición/),
      ).toBeTruthy();
      expect(onIngestada).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();

      await user.click(
        screen.getByRole('button', { name: 'Reemplazar libro' }),
      );

      await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
      expect(vi.mocked(ingestarRai).mock.calls[1][1]).toMatchObject({
        reemplazar: true,
      });
    });

    it('al cancelar no guarda nada', async () => {
      vi.mocked(ingestarRai).mockRejectedValueOnce(errorLibroDuplicado());
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, [fila(1)]);
      await user.click(botonConfirmar());
      await screen.findByText(/Ya hay un RAI en esta rendición/);

      const cancelar = screen.getAllByRole('button', { name: 'Cancelar' });
      await user.click(cancelar[cancelar.length - 1]);

      expect(ingestarRai).toHaveBeenCalledTimes(1);
      expect(onIngestada).not.toHaveBeenCalled();
    });
  });

  it('otro error del servidor se informa con un aviso y no ofrece reemplazar', async () => {
    vi.mocked(ingestarRai).mockRejectedValueOnce(
      new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { message: 'No se pueden modificar ni subir libros' },
      } as AxiosResponse),
    );
    const { user } = renderDialogo();
    await subirArchivo(user, [fila(1)]);

    await user.click(botonConfirmar());

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText(/Ya hay un RAI/)).toBeNull();
  });
});
