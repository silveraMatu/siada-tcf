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

import { obtenerIngresosEgresos } from '@/features/ingresos-egresos/api/ingresos-egresos.api';
import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
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
vi.mock('@/features/ingresos-egresos/api/ingresos-egresos.api', () => ({
  obtenerIngresosEgresos: vi.fn(),
  ingestarIngresosEgresos: vi.fn(),
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

/** Libro de Ingresos y Egresos guardado con `cantidad` filas. */
const ingresosEgresos = (cantidad = 2): IngresosEgresosGuardado => ({
  id: 9,
  cuentaMensualId: 5,
  numeroCuentaCte: null,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  transacciones: Array.from({ length: cantidad }, (_, i) => ({
    id: 900 + i,
    fila: 4 + i,
    fecha: `2026-03-0${i + 2}`,
    concepto: `Concepto IE ${i + 1}`,
    cheque: null,
    comprobante: null,
    cajaDebe: 0,
    cajaHaber: 0,
    cajaSaldo: 100,
    bancoDebe: 0,
    bancoHaber: 0,
    bancoSaldo: 200,
    egresoInc1: 0,
    egresoInc2: 0,
    egresoInc3: 0,
    egresoInc4: 0,
    egresoInc5: 0,
    ingresoMunicipal: 0,
    ingresoOtras: 0,
    cuentasVariasConcepto: null,
    cuentasVariasDebe: 0,
    cuentasVariasHaber: 0,
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
      vi.mocked(obtenerIngresosEgresos).mockResolvedValue(ingresosEgresos());
    });

    it('lista los documentos de la rendición sin los botones de carga sueltos de antes', async () => {
      renderDetalle('EN_BORRADOR');

      expect(screen.getByText('Documentos de la rendición')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Libro Banco' })).toBeTruthy();
      expect(
        screen.getByRole('heading', { name: 'Ingresos y Egresos' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Cargar Documentos' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Cargar Ingresos y Egresos' }),
      ).toBeNull();
      expect(screen.queryByText(/bloqueada para modificaciones/)).toBeNull();
      await waitFor(() => expect(botonPresentar().disabled).toBe(false));
    });

    it('con los dos documentos cargados muestra «2 de 2 listos» y deja presentar', async () => {
      renderDetalle('EN_BORRADOR');

      expect(await screen.findByText('2 de 2 listos')).toBeTruthy();
      expect(screen.getByText('2 cuentas cargadas')).toBeTruthy();
      expect(screen.getByText('Cargado')).toBeTruthy();
      expect(screen.getByText(/Documentos completos/)).toBeTruthy();
      expect(botonPresentar().disabled).toBe(false);
      expect(
        screen.getByRole('button', { name: 'Agregar otra cuenta' }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeTruthy();
    });

    it('el libro de Ingresos y Egresos cargado se resume y sus filas se ven a pedido', async () => {
      const { user } = renderDetalle('EN_BORRADOR');

      expect(
        await screen.findByText(/2 filas · 02\/03\/2026 al 03\/03\/2026/),
      ).toBeTruthy();
      expect(screen.queryByText('Concepto IE 1')).toBeNull();

      const ver = screen.getByRole('button', { name: 'Ver filas' });
      expect(ver.getAttribute('aria-expanded')).toBe('false');
      await user.click(ver);

      expect(await screen.findByText('Concepto IE 1')).toBeTruthy();
      expect(
        screen
          .getByRole('button', { name: 'Ocultar filas' })
          .getAttribute('aria-expanded'),
      ).toBe('true');
    });

    it('sin nada cargado marca los dos como faltantes y no deja presentar', async () => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
      vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
      renderDetalle('EN_BORRADOR');

      expect(await screen.findByText('0 de 2 listos')).toBeTruthy();
      expect(screen.getAllByText('Falta')).toHaveLength(2);
      expect(
        screen.getByText('Falta cargar: Libro Banco y Ingresos y Egresos'),
      ).toBeTruthy();
      expect(botonPresentar().disabled).toBe(true);
      expect(
        (
          screen.getByRole('button', {
            name: 'Cargar libro banco',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
      expect(
        screen.getByRole('button', { name: 'Cargar ingresos y egresos' }),
      ).toBeTruthy();
    });

    it('con solo el Libro Banco dice qué falta y no deja presentar', async () => {
      vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
      renderDetalle('EN_BORRADOR');

      expect(await screen.findByText('1 de 2 listos')).toBeTruthy();
      expect(screen.getByText('Falta cargar: Ingresos y Egresos')).toBeTruthy();
      expect(botonPresentar().disabled).toBe(true);
    });

    it('con solo Ingresos y Egresos pide el Libro Banco', async () => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
      renderDetalle('EN_BORRADOR');

      expect(await screen.findByText('1 de 2 listos')).toBeTruthy();
      expect(screen.getByText('Falta cargar: Libro Banco')).toBeTruthy();
      expect(botonPresentar().disabled).toBe(true);
    });

    it('los libros banco se ven como un resumen, sin sus filas, igual que en auditoría', async () => {
      renderDetalle('EN_BORRADOR');

      const lista = await screen.findByRole('list', {
        name: 'Libros banco cargados',
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
      expect(screen.getByText('2 filas', { selector: 'strong' })).toBeTruthy();

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

    it('«Cargar libro banco» abre su diálogo y «Reemplazar» el de Ingresos y Egresos como reemplazo', async () => {
      const { user } = renderDetalle('EN_BORRADOR');

      await user.click(
        await screen.findByRole('button', { name: 'Agregar otra cuenta' }),
      );
      expect(
        await screen.findByRole('heading', { name: 'Cargar Libro Banco' }),
      ).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      await user.click(screen.getByRole('button', { name: 'Reemplazar' }));
      expect(
        await screen.findByRole('heading', {
          name: 'Reemplazar Ingresos y Egresos',
        }),
      ).toBeTruthy();
      expect(screen.getByText(/Al confirmar se reemplaza/)).toBeTruthy();
    });
  });

  describe.each([
    ['LISTO_PARA_AUDITAR', 'Listo para Auditar'],
    ['EN_AUDITORIA', 'En Auditoría'],
    ['AUDITADA', 'Auditada'],
  ])('presentada (%s)', (estado, etiqueta) => {
    it('bloquea la carga, indica el estado y muestra los documentos en solo lectura', async () => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([libro(1, '123/4')]);
      vi.mocked(obtenerIngresosEgresos).mockResolvedValue(ingresosEgresos());
      const { user } = renderDetalle(estado);

      expect(
        screen.getByText(/ya ha sido presentada y se encuentra bloqueada/),
      ).toBeTruthy();
      expect(screen.getAllByText(etiqueta).length).toBeGreaterThan(0);
      for (const nombre of [
        'Cargar libro banco',
        'Agregar otra cuenta',
        'Cargar ingresos y egresos',
        'Reemplazar',
        'Presentar Rendición Definitiva',
      ]) {
        expect(screen.queryByRole('button', { name: nombre })).toBeNull();
      }

      //el libro banco se ve como resumen y sus filas se abren a pedido
      const boton = await screen.findByRole('button', {
        name: 'Cta. Cte. 123/4',
      });
      expect(screen.queryByText('Proveedor SA')).toBeNull();
      await user.click(boton);
      expect(await screen.findAllByText('Proveedor SA')).toBeTruthy();
      //Ingresos y Egresos también se puede revisar
      expect(
        await screen.findByRole('button', { name: 'Ver filas' }),
      ).toBeTruthy();
    });
  });

  it('un estado desconocido también se trata como bloqueado', () => {
    vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
    vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
    renderDetalle('ESTADO_NUEVO');

    expect(screen.getByText(/bloqueada para modificaciones/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Cargar libro banco' }),
    ).toBeNull();
  });

  it('en una presentada, lo que no se cargó se informa sin ofrecer cargarlo', async () => {
    vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
    vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
    renderDetalle('LISTO_PARA_AUDITAR');

    expect(await screen.findAllByText('No se cargó')).toHaveLength(2);
    expect(screen.queryByText('Falta')).toBeNull();
  });
});
