// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ingestarRaci } from '../api/raci.api';
import { parseRaciExcel } from '../lib/parse-raci';
import type { FilaRaciPreview } from '../types';
import { IngestarRaciDialog } from './IngestarRaciDialog';

vi.mock('../api/raci.api', () => ({ ingestarRaci: vi.fn() }));
vi.mock('../lib/parse-raci', () => ({
  RaciParseError: class extends Error {},
  parseRaciExcel: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fila = (asiento: number, errores: string[] = []): FilaRaciPreview => ({
  fila: asiento + 3,
  transaccion: {
    asiento,
    fecha: '2026-03-02',
    concepto: `Concepto ${asiento}`,
    compromisoDelMes: 100,
    compromisoAcumulado: 100,
    devengadoDelMes: 0,
    devengadoAcumulado: 0,
    devengadoSaldo: 100,
    pagoDelMes: 0,
    pagoAcumulado: 0,
    pagoSaldoAPagar: 0,
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
      message: 'Ya existe un libro RACI en esta rendición.',
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
      <IngestarRaciDialog
        open
        onOpenChange={vi.fn()}
        cuentaMensualId={5}
        onIngestada={onIngestada}
        libroExistente={libroExistente}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onIngestada };
}

async function subirArchivo(
  user: ReturnType<typeof userEvent.setup>,
  filas: FilaRaciPreview[],
  nombre = 'raci.xls',
  omitidas = 0,
) {
  vi.mocked(parseRaciExcel).mockResolvedValue({ filas, omitidas });
  const entrada = document.querySelector('input[type="file"]');
  await user.upload(entrada as HTMLInputElement, new File(['x'], nombre));
  await screen.findByText(nombre);
}

const botonConfirmar = () =>
  screen.getByRole('button', {
    name: /Confirmar y (subir|reemplazar)/,
  }) as HTMLButtonElement;

beforeEach(() => {
  vi.mocked(ingestarRaci).mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('IngestarRaciDialog', () => {
  it('ofrece los formatos de la planilla del RACI, incluido .xls', () => {
    renderDialogo();
    const entrada = document.querySelector('input[type="file"]');
    expect(entrada?.getAttribute('accept')).toBe('.xls,.xlsx,.csv');
    expect(screen.getByText(/\.xls, \.xlsx y \.csv/)).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);
  });

  it('al soltar un .xls muestra la vista previa con los asientos y las filas omitidas', async () => {
    const { user } = renderDialogo();

    await subirArchivo(user, [fila(1), fila(2)], 'raci.xls', 23);

    expect(screen.getByText(/2 asientos/)).toBeTruthy();
    expect(
      screen.getByText(/23 filas omitidas \(en blanco o base\)/),
    ).toBeTruthy();
    expect(screen.getByText('Concepto 1')).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(false);
  });

  it('envía solo los asientos, sin la fila ni la partida, y avisa al terminar', async () => {
    const { user, onIngestada } = renderDialogo();
    await subirArchivo(user, [{ ...fila(1), partida: '2 · 2.1' }, fila(2)]);

    await user.click(botonConfirmar());

    await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
    const [cuentaId, payload] = vi.mocked(ingestarRaci).mock.calls[0];
    expect(cuentaId).toBe(5);
    expect(payload.transacciones.map((t) => t.asiento)).toEqual([1, 2]);
    expect(payload.transacciones[0]).not.toHaveProperty('partida');
    expect(payload.transacciones[0]).not.toHaveProperty('fila');
    expect(payload.reemplazar).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });

  it('con asientos con errores avisa y no permite enviar', async () => {
    const { user } = renderDialogo();
    await subirArchivo(user, [
      fila(1),
      fila(2, ['El concepto es obligatorio']),
    ]);

    expect(screen.getByText(/1 asiento tiene errores/)).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);
    expect(ingestarRaci).not.toHaveBeenCalled();
  });

  it('rechaza un formato no admitido sin leerlo', async () => {
    renderDialogo();
    // el input filtra por `accept`: se desactiva para simular que el archivo llega igual (arrastrado)
    const user = userEvent.setup({ applyAccept: false });
    const entrada = document.querySelector('input[type="file"]');

    await user.upload(entrada as HTMLInputElement, new File(['x'], 'raci.pdf'));

    expect(await screen.findByText(/Formato no admitido/)).toBeTruthy();
    expect(parseRaciExcel).not.toHaveBeenCalled();
  });

  it('con un libro ya cargado es un reemplazo desde el inicio', async () => {
    const { user, onIngestada } = renderDialogo({
      asientos: 12,
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-30',
      cargadoEl: '2026-10-15T12:00:00.000Z',
      subidoPor: null,
    });
    expect(
      screen.getByText(/Ya hay un RACI cargado \(12 asientos/),
    ).toBeTruthy();

    await subirArchivo(user, [fila(1)]);
    await user.click(
      screen.getByRole('button', { name: 'Confirmar y reemplazar' }),
    );

    await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
    expect(vi.mocked(ingestarRaci).mock.calls[0][1]).toMatchObject({
      reemplazar: true,
    });
  });

  describe('libro ya cargado detectado por el servidor (409)', () => {
    it('ofrece reemplazar y reenvía con reemplazar: true', async () => {
      vi.mocked(ingestarRaci).mockRejectedValueOnce(errorLibroDuplicado());
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, [fila(1)]);

      await user.click(botonConfirmar());
      expect(
        await screen.findByText(/Ya hay un RACI en esta rendición/),
      ).toBeTruthy();
      expect(onIngestada).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();

      await user.click(
        screen.getByRole('button', { name: 'Reemplazar libro' }),
      );

      await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
      expect(vi.mocked(ingestarRaci).mock.calls[1][1]).toMatchObject({
        reemplazar: true,
      });
    });

    it('al cancelar no guarda nada', async () => {
      vi.mocked(ingestarRaci).mockRejectedValueOnce(errorLibroDuplicado());
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, [fila(1)]);
      await user.click(botonConfirmar());
      await screen.findByText(/Ya hay un RACI en esta rendición/);

      const cancelar = screen.getAllByRole('button', { name: 'Cancelar' });
      await user.click(cancelar[cancelar.length - 1]);

      expect(ingestarRaci).toHaveBeenCalledTimes(1);
      expect(onIngestada).not.toHaveBeenCalled();
    });
  });

  it('otro error del servidor se informa con un aviso y no ofrece reemplazar', async () => {
    vi.mocked(ingestarRaci).mockRejectedValueOnce(
      new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { message: 'No se pueden modificar ni subir libros' },
      } as AxiosResponse),
    );
    const { user } = renderDialogo();
    await subirArchivo(user, [fila(1)]);

    await user.click(botonConfirmar());

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText(/Ya hay un RACI/)).toBeNull();
  });
});
