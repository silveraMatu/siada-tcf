// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ingestarIngresosEgresos } from '../api/ingresos-egresos.api';
import { parseIngresosEgresosExcel } from '../lib/parse-ingresos-egresos';
import type { FilaIngresoEgresoPreview } from '../types';
import { IngestarIngresosEgresosDialog } from './IngestarIngresosEgresosDialog';

vi.mock('../api/ingresos-egresos.api', () => ({
  ingestarIngresosEgresos: vi.fn(),
}));
vi.mock('../lib/parse-ingresos-egresos', () => ({
  IngresosEgresosParseError: class extends Error {},
  parseIngresosEgresosExcel: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fila = (
  numero: number,
  errores: string[] = [],
): FilaIngresoEgresoPreview => ({
  transaccion: {
    fila: numero,
    fecha: '2026-03-02',
    concepto: `Concepto ${numero}`,
    cajaDebe: 0,
    cajaHaber: 0,
    cajaSaldo: 10,
    bancoDebe: 0,
    bancoHaber: 0,
    bancoSaldo: 20,
    egresoInc1: 0,
    egresoInc2: 0,
    egresoInc3: 0,
    egresoInc4: 0,
    egresoInc5: 0,
    ingresoMunicipal: 0,
    ingresoOtras: 0,
    cuentasVariasDebe: 0,
    cuentasVariasHaber: 0,
  },
  errores,
});

//409 con el cuerpo que arma el backend cuando la rendición ya tiene el libro
const errorLibroDuplicado = () =>
  new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: {
      statusCode: 409,
      codigo: 'LIBRO_DUPLICADO',
      message: 'Ya existe un libro de ingresos y egresos en esta rendición.',
      libroExistente: {
        id: 7,
        numeroCuentaCte: null,
        fechaCreacion: '2026-10-15T12:00:00.000Z',
        cantidadTransacciones: 12,
      },
    },
  } as AxiosResponse);

function renderDialogo() {
  const onIngestada = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <IngestarIngresosEgresosDialog
        open
        onOpenChange={vi.fn()}
        cuentaMensualId={5}
        onIngestada={onIngestada}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onIngestada };
}

async function subirArchivo(
  user: ReturnType<typeof userEvent.setup>,
  filas: FilaIngresoEgresoPreview[],
  nombre = 'ie.xlsx',
) {
  vi.mocked(parseIngresosEgresosExcel).mockResolvedValue({ filas });
  const entrada = document.querySelector('input[type="file"]');
  await user.upload(entrada as HTMLInputElement, new File(['x'], nombre));
  await screen.findByText(nombre);
}

const botonConfirmar = () =>
  screen.getByRole('button', {
    name: 'Confirmar y Subir',
  }) as HTMLButtonElement;

beforeEach(() => {
  vi.mocked(ingestarIngresosEgresos).mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('IngestarIngresosEgresosDialog', () => {
  it('al soltar el archivo muestra la vista previa y habilita «Confirmar y Subir»', async () => {
    const { user } = renderDialogo();
    expect(
      screen.queryByRole('button', { name: 'Confirmar y Subir' }),
    ).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);

    await subirArchivo(user, [fila(4), fila(5)]);

    expect(screen.getByText(/2 filas/)).toBeTruthy();
    expect(screen.getByText('Concepto 4')).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(false);
  });

  it('envía las transacciones a la rendición y avisa al terminar', async () => {
    const { user, onIngestada } = renderDialogo();
    await subirArchivo(user, [fila(4), fila(5)]);

    await user.click(botonConfirmar());

    await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
    const [cuentaId, payload] = vi.mocked(ingestarIngresosEgresos).mock
      .calls[0];
    expect(cuentaId).toBe(5);
    expect(payload.transacciones.map((t) => t.fila)).toEqual([4, 5]);
    expect(payload.reemplazar).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });

  it('con filas con errores avisa y no permite enviar', async () => {
    const { user } = renderDialogo();
    await subirArchivo(user, [
      fila(4),
      fila(5, ['El concepto es obligatorio']),
    ]);

    expect(screen.getByText(/1 fila tiene errores/)).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);
    expect(ingestarIngresosEgresos).not.toHaveBeenCalled();
  });

  it('rechaza un formato no admitido sin leerlo', async () => {
    renderDialogo();
    // el input filtra por `accept`: se desactiva para simular que el archivo llega igual (arrastrado)
    const user = userEvent.setup({ applyAccept: false });
    const entrada = document.querySelector('input[type="file"]');

    await user.upload(
      entrada as HTMLInputElement,
      new File(['x'], 'libro.pdf'),
    );

    expect(await screen.findByText(/Formato no admitido/)).toBeTruthy();
    expect(parseIngresosEgresosExcel).not.toHaveBeenCalled();
  });

  describe('libro ya cargado en la rendición', () => {
    it('ofrece reemplazar y reenvía con reemplazar: true', async () => {
      vi.mocked(ingestarIngresosEgresos).mockRejectedValueOnce(
        errorLibroDuplicado(),
      );
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, [fila(4)]);

      await user.click(botonConfirmar());
      expect(
        await screen.findByText(/Ya hay un libro de Ingresos y Egresos/),
      ).toBeTruthy();
      expect(onIngestada).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();

      await user.click(
        screen.getByRole('button', { name: 'Reemplazar libro' }),
      );

      await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
      expect(vi.mocked(ingestarIngresosEgresos).mock.calls[1][1]).toMatchObject(
        {
          reemplazar: true,
        },
      );
    });

    it('al cancelar no guarda nada', async () => {
      vi.mocked(ingestarIngresosEgresos).mockRejectedValueOnce(
        errorLibroDuplicado(),
      );
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, [fila(4)]);
      await user.click(botonConfirmar());
      await screen.findByText(/Ya hay un libro de Ingresos y Egresos/);

      const cancelar = screen.getAllByRole('button', { name: 'Cancelar' });
      await user.click(cancelar[cancelar.length - 1]);

      expect(ingestarIngresosEgresos).toHaveBeenCalledTimes(1);
      expect(onIngestada).not.toHaveBeenCalled();
    });
  });

  it('otro error del servidor se informa con un aviso y no ofrece reemplazar', async () => {
    vi.mocked(ingestarIngresosEgresos).mockRejectedValueOnce(
      new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { message: 'No se pueden modificar ni subir libros' },
      } as AxiosResponse),
    );
    const { user } = renderDialogo();
    await subirArchivo(user, [fila(4)]);

    await user.click(botonConfirmar());

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText(/Ya hay un libro/)).toBeNull();
  });
});
