// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerLibrosBanco } from '@/features/libro-banco/api/libro-banco.api';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import { presentarCuentaMensual } from '../api/cuentas.api';
import type { ContextoCuenta, CuentaMensual } from '../types';
import { CuentaMensualDetalle } from './CuentaMensualDetalle';

vi.mock('../api/cuentas.api', () => ({
  presentarCuentaMensual: vi.fn(),
  resolverCuentaMensual: vi.fn(),
}));
vi.mock('@/features/libro-banco/api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const contexto: ContextoCuenta = {
  organismoId: 3,
  organismoNombre: 'Municipalidad de Pirané',
  ejercicioFiscal: 2026,
  mes: 3,
};

const cuenta = (estado: string): CuentaMensual => ({
  id: 5,
  mes: 3,
  cuentaAnualId: 9,
  estado,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
});

/** Libro guardado con `cantidad` transacciones idénticas. */
const libro = (
  id: number,
  numeroCuentaCte: string,
  cantidad = 1,
): LibroBancoGuardado => ({
  id,
  cuentaMensualId: 5,
  numeroCuentaCte,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  transacciones: Array.from({ length: cantidad }, (_, i) => ({
    id: id * 100 + i,
    fecha: '2026-03-02',
    cheque: null,
    aLaOrdenDe: 'Proveedor SA',
    depositos: 0,
    retiro: 1500.5,
    saldo: 8499.5,
  })),
});

function renderDetalle(estado: string, onActualizada = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CuentaMensualDetalle
        cuenta={cuenta(estado)}
        contexto={contexto}
        onActualizada={onActualizada}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onActualizada };
}

const botonPresentar = () =>
  screen.getByRole('button', {
    name: 'Presentar Rendición Definitiva',
  }) as HTMLButtonElement;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CuentaMensualDetalle', () => {
  describe('en borrador', () => {
    beforeEach(() => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([
        libro(1, '100234/1', 2),
        libro(2, '100234/2', 1),
      ]);
    });

    it('ofrece cargar documentos y presentar, sin el aviso de bloqueo', async () => {
      renderDetalle('EN_BORRADOR');

      expect(
        screen.getByRole('button', { name: 'Cargar Documentos' }),
      ).toBeTruthy();
      expect(botonPresentar()).toBeTruthy();
      expect(screen.queryByText(/bloqueada para modificaciones/)).toBeNull();
      await waitFor(() => expect(botonPresentar().disabled).toBe(false));
    });

    it('muestra los libros ya cargados antes de presentar', async () => {
      renderDetalle('EN_BORRADOR');

      expect(screen.getByText('Libros cargados')).toBeTruthy();
      expect(await screen.findByText(/Cta\. Cte\. 100234\/1/)).toBeTruthy();
      expect(screen.getByText(/Cta\. Cte\. 100234\/2/)).toBeTruthy();
      expect(vi.mocked(obtenerLibrosBanco).mock.calls[0][0]).toBe(5);
    });

    it('los libros se ven como un resumen, sin sus filas, igual que en auditoría', async () => {
      renderDetalle('EN_BORRADOR');

      const lista = await screen.findByRole('list', {
        name: 'Libros cargados',
      });
      const filas = within(lista).getAllByRole('listitem');
      expect(filas).toHaveLength(2);
      expect(within(filas[0]).getByText('Libro Banco')).toBeTruthy();
      expect(
        within(filas[0]).getByRole('button', { name: 'Cta. Cte. 100234/1' }),
      ).toBeTruthy();
      expect(
        within(filas[0]).getByText('2 transacciones · 02/03/2026'),
      ).toBeTruthy();
      expect(
        within(filas[1]).getByText('1 transacción · 02/03/2026'),
      ).toBeTruthy();
      // solo la pestaña de resumen: ninguna tabla ni transacción a la vista
      expect(screen.getAllByRole('tab')).toHaveLength(1);
      expect(screen.queryByText('Proveedor SA')).toBeNull();
    });

    it('al clicar el nombre de un libro se abre su pestaña con las filas y columnas', async () => {
      const { user } = renderDetalle('EN_BORRADOR');

      await user.click(
        await screen.findByRole('button', { name: 'Cta. Cte. 100234/1' }),
      );

      const pestana = screen.getByRole('tab', { name: 'Cta. Cte. 100234/1' });
      expect(pestana.getAttribute('aria-selected')).toBe('true');
      expect(await screen.findAllByText('Proveedor SA')).toHaveLength(2);
      expect(
        screen.getByRole('columnheader', { name: 'Depósitos' }),
      ).toBeTruthy();
    });

    it('la pestaña del libro se cierra y se vuelve al resumen', async () => {
      const { user } = renderDetalle('EN_BORRADOR');
      await user.click(
        await screen.findByRole('button', { name: 'Cta. Cte. 100234/2' }),
      );
      await screen.findByText('Proveedor SA');

      await user.click(screen.getByRole('button', { name: 'Cerrar' }));

      expect(
        screen.queryByRole('tab', { name: 'Cta. Cte. 100234/2' }),
      ).toBeNull();
      expect(
        screen
          .getByRole('tab', { name: /Resumen/ })
          .getAttribute('aria-selected'),
      ).toBe('true');
      expect(screen.queryByText('Proveedor SA')).toBeNull();
    });

    it('sin ningún libro cargado no se puede presentar y se invita a cargar uno', async () => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
      renderDetalle('EN_BORRADOR');

      expect(
        await screen.findByText('Todavía no cargó ningún libro'),
      ).toBeTruthy();
      expect(botonPresentar().disabled).toBe(true);
      expect(
        screen.getByText(/Cargue al menos un libro para poder presentar/),
      ).toBeTruthy();
      expect(
        (
          screen.getByRole('button', {
            name: 'Cargar Documentos',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });

    it('advierte antes de presentar, resume lo que se presenta y no envía si se cancela', async () => {
      const { user } = renderDetalle('EN_BORRADOR');
      await waitFor(() => expect(botonPresentar().disabled).toBe(false));

      await user.click(botonPresentar());
      expect(
        await screen.findByText(/No podrá modificar ni subir más archivos/),
      ).toBeTruthy();
      expect(screen.getByText(/Se presentarán/)).toBeTruthy();
      expect(screen.getByText('2 libros')).toBeTruthy();
      expect(screen.getByText('3 transacciones')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(presentarCuentaMensual).not.toHaveBeenCalled();
    });

    it('al confirmar presenta la cuenta y avisa a la vista con la cuenta actualizada', async () => {
      vi.mocked(presentarCuentaMensual).mockResolvedValue(
        cuenta('LISTO_PARA_AUDITAR'),
      );
      const { user, onActualizada } = renderDetalle('EN_BORRADOR');
      await waitFor(() => expect(botonPresentar().disabled).toBe(false));

      await user.click(botonPresentar());
      await user.click(
        await screen.findByRole('button', { name: 'Presentar' }),
      );

      await waitFor(() => expect(onActualizada).toHaveBeenCalledTimes(1));
      expect(vi.mocked(presentarCuentaMensual).mock.calls[0][0]).toBe(5);
      expect(onActualizada.mock.calls[0][0]).toMatchObject({
        id: 5,
        estado: 'LISTO_PARA_AUDITAR',
      });
    });
  });

  describe.each([
    ['LISTO_PARA_AUDITAR', 'Listo para Auditar'],
    ['EN_AUDITORIA', 'En Auditoría'],
    ['AUDITADA', 'Auditada'],
  ])('presentada (%s)', (estado, etiqueta) => {
    it('bloquea la carga, indica el estado y muestra el libro guardado en solo lectura', async () => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([libro(1, '123/4')]);
      const { user } = renderDetalle(estado);

      expect(
        screen.getByText(/ya ha sido presentada y se encuentra bloqueada/),
      ).toBeTruthy();
      expect(screen.getAllByText(etiqueta).length).toBeGreaterThan(0);
      expect(
        screen.queryByRole('button', { name: 'Cargar Documentos' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', {
          name: 'Presentar Rendición Definitiva',
        }),
      ).toBeNull();

      //el libro está cargado pero cerrado: se ve su encabezado y la tabla se abre a pedido
      const boton = await screen.findByRole('button', {
        name: /Cta\. Cte\. 123\/4/,
      });
      expect(screen.queryByText('Proveedor SA')).toBeNull();
      await user.click(boton);
      expect(await screen.findByText('Proveedor SA')).toBeTruthy();
      expect(screen.queryByText('Libros cargados')).toBeNull();
    });
  });

  it('un estado desconocido también se trata como bloqueado', () => {
    vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
    renderDetalle('ESTADO_NUEVO');

    expect(screen.getByText(/bloqueada para modificaciones/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Cargar Documentos' }),
    ).toBeNull();
  });

  it('avisa si la presentada no tiene libros', async () => {
    vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
    renderDetalle('LISTO_PARA_AUDITAR');

    expect(
      await screen.findByText('Esta rendición no tiene libros cargados'),
    ).toBeTruthy();
  });
});
