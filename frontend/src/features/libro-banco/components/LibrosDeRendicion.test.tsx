// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResumenLibro } from '@/features/cuentas/types';
import { obtenerIngresosEgresos } from '@/features/ingresos-egresos/api/ingresos-egresos.api';
import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
import { obtenerLibrosBanco } from '../api/libro-banco.api';
import type { LibroBancoGuardado } from '../types';
import { LibrosDeRendicion, type FocoLibro } from './LibrosDeRendicion';

vi.mock('@/features/ingresos-egresos/api/ingresos-egresos.api', () => ({
  obtenerIngresosEgresos: vi.fn(),
  ingestarIngresosEgresos: vi.fn(),
}));
vi.mock('../api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));

const resumen = (id: number, numeroCuentaCte: string): ResumenLibro => ({
  id,
  tipo: 'LIBRO_BANCO',
  numeroCuentaCte,
  cantidadTransacciones: 1,
  fechaDesde: '2026-03-02',
  fechaHasta: '2026-03-02',
});

/** Libro guardado con una transacción cuyo concepto lo identifica. */
const guardado = (
  id: number,
  numeroCuentaCte: string,
  concepto: string,
): LibroBancoGuardado => ({
  id,
  cuentaMensualId: 5,
  numeroCuentaCte,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  subidoPorId: 1,
  subidoPor: null,
  hashContenido: 'a'.repeat(64),
  transacciones: [
    {
      id: id * 10,
      fecha: '2026-03-02',
      cheque: null,
      aLaOrdenDe: concepto,
      depositos: 0,
      retiro: 100,
      saldo: 900,
    },
  ],
});

const LIBROS = [resumen(1, '100234/1'), resumen(2, '100234/2')];

function renderLibros(libros: ResumenLibro[] = LIBROS, foco?: FocoLibro) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const pintar = (items: ResumenLibro[], pedido?: FocoLibro) => (
    <QueryClientProvider client={client}>
      <LibrosDeRendicion
        cuentaMensualId={5}
        libros={items}
        etiqueta="Libros de Abril 2026"
        foco={pedido}
      />
    </QueryClientProvider>
  );
  const vista = render(pintar(libros, foco));
  return {
    user: userEvent.setup(),
    cambiarLibros: (items: ResumenLibro[]) => vista.rerender(pintar(items)),
    pedirFoco: (pedido: FocoLibro) => vista.rerender(pintar(libros, pedido)),
  };
}

function datosDeLosLibros() {
  vi.mocked(obtenerLibrosBanco).mockResolvedValue([
    guardado(1, '100234/1', 'Proveedor Uno'),
    guardado(2, '100234/2', 'Proveedor Dos'),
  ]);
}

beforeEach(() => {
  // jsdom no implementa estas dos: la tabla las usa para llevar la vista hasta la fila pedida
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LibrosDeRendicion', () => {
  it('sin libros no muestra nada', () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <LibrosDeRendicion cuentaMensualId={5} libros={[]} />
      </QueryClientProvider>,
    );

    expect(container.textContent).toBe('');
  });

  it('arranca en el resumen: una fila por libro y ninguna transacción, sin pedirlas al servidor', () => {
    datosDeLosLibros();
    renderLibros();

    const filas = within(
      screen.getByRole('list', { name: 'Libros de Abril 2026' }),
    ).getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(
      screen
        .getByRole('tab', { name: /Resumen/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.queryByRole('columnheader')).toBeNull();
    // las transacciones se piden recién al abrir un libro
    expect(obtenerLibrosBanco).not.toHaveBeenCalled();
  });

  it('el resumen cuenta cuántos libros hay, como los contadores de las pestañas del admin', () => {
    renderLibros();

    expect(screen.getByRole('tab', { name: /Resumen\s*2/ })).toBeTruthy();
  });

  it('al clicar el nombre de un libro se abre su pestaña con las filas y columnas', async () => {
    datosDeLosLibros();
    const { user } = renderLibros();

    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/1' }),
    );

    const pestana = screen.getByRole('tab', { name: 'Cta. Cte. 100234/1' });
    expect(pestana.getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('Proveedor Uno')).toBeTruthy();
    for (const columna of ['Fecha', 'Cheque', 'Depósitos', 'Retiro', 'Saldo']) {
      expect(screen.getByRole('columnheader', { name: columna })).toBeTruthy();
    }
    expect(screen.queryByText('Proveedor Dos')).toBeNull();
    expect(vi.mocked(obtenerLibrosBanco).mock.calls[0][0]).toBe(5);
  });

  it('abrir dos libros deja dos pestañas y se navega entre ellas y el resumen', async () => {
    datosDeLosLibros();
    const { user } = renderLibros();
    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/1' }),
    );
    await screen.findByText('Proveedor Uno');

    await user.click(screen.getByRole('tab', { name: /Resumen/ }));
    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/2' }),
    );

    expect(await screen.findByText('Proveedor Dos')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);

    await user.click(screen.getByRole('tab', { name: 'Cta. Cte. 100234/1' }));
    expect(await screen.findByText('Proveedor Uno')).toBeTruthy();
    expect(screen.queryByText('Proveedor Dos')).toBeNull();
  });

  it('volver a clicar un libro ya abierto va a su pestaña sin duplicarla', async () => {
    datosDeLosLibros();
    const { user } = renderLibros();
    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/1' }),
    );
    await screen.findByText('Proveedor Uno');
    await user.click(screen.getByRole('tab', { name: /Resumen/ }));

    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/1' }),
    );

    expect(
      screen.getAllByRole('tab', { name: 'Cta. Cte. 100234/1' }),
    ).toHaveLength(1);
    expect(
      screen
        .getByRole('tab', { name: 'Cta. Cte. 100234/1' })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('«Cerrar» quita la pestaña y vuelve al resumen', async () => {
    datosDeLosLibros();
    const { user } = renderLibros();
    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/2' }),
    );
    await screen.findByText('Proveedor Dos');

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(
      screen.queryByRole('tab', { name: 'Cta. Cte. 100234/2' }),
    ).toBeNull();
    expect(
      screen
        .getByRole('tab', { name: /Resumen/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.queryByText('Proveedor Dos')).toBeNull();
  });

  it('si el libro deja de existir (por ejemplo se reemplazó) su pestaña se cierra sola', async () => {
    datosDeLosLibros();
    const { user, cambiarLibros } = renderLibros();
    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/1' }),
    );
    await screen.findByText('Proveedor Uno');

    cambiarLibros([resumen(3, '100234/1'), resumen(2, '100234/2')]);

    expect(
      screen.queryByRole('tab', { name: 'Cta. Cte. 100234/1' }),
    ).toBeNull();
    expect(
      screen
        .getByRole('tab', { name: /Resumen/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('si no se pueden traer las filas, avisa con la opción de reintentar', async () => {
    vi.mocked(obtenerLibrosBanco).mockRejectedValue(new Error('Sin conexión'));
    const { user } = renderLibros();

    await user.click(
      screen.getByRole('button', { name: 'Cta. Cte. 100234/1' }),
    );

    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
  describe('ubicar una fila (foco)', () => {
    it('abre la pestaña del libro pedido y marca la fila', async () => {
      datosDeLosLibros();
      const { pedirFoco } = renderLibros();

      pedirFoco({
        libroTipo: 'LIBRO_BANCO',
        libroId: 2,
        transaccionId: 20,
        clave: 1,
      });

      expect(
        screen
          .getByRole('tab', { name: 'Cta. Cte. 100234/2' })
          .getAttribute('aria-selected'),
      ).toBe('true');
      const fila = (await screen.findByText('Proveedor Dos')).closest('tr');
      expect(fila?.getAttribute('aria-current')).toBe('true');
      expect(document.activeElement).toBe(fila);
    });

    it('un libro que no está en la rendición se ignora', () => {
      datosDeLosLibros();
      const { pedirFoco } = renderLibros();

      pedirFoco({
        libroTipo: 'LIBRO_BANCO',
        libroId: 99,
        transaccionId: 1,
        clave: 1,
      });

      expect(screen.getAllByRole('tab')).toHaveLength(1);
    });

    it('al cerrar la pestaña y reabrirla a mano no se vuelve a marcar la fila', async () => {
      datosDeLosLibros();
      const { user, pedirFoco } = renderLibros();
      pedirFoco({
        libroTipo: 'LIBRO_BANCO',
        libroId: 2,
        transaccionId: 20,
        clave: 1,
      });
      await screen.findByText('Proveedor Dos');
      await user.click(screen.getByRole('button', { name: 'Cerrar' }));

      await user.click(
        screen.getByRole('button', { name: 'Cta. Cte. 100234/2' }),
      );

      const fila = (await screen.findByText('Proveedor Dos')).closest('tr');
      expect(fila?.getAttribute('aria-current')).toBeNull();
    });
  });

  describe('libro de Ingresos y Egresos', () => {
    // comparte el id 2 con el segundo libro banco: las pestañas se distinguen por tipo
    const ingresosEgresos: ResumenLibro = {
      id: 2,
      tipo: 'INGRESOS_EGRESOS',
      numeroCuentaCte: null,
      cantidadTransacciones: 2,
      fechaDesde: '2026-03-02',
      fechaHasta: '2026-03-03',
    };
    const guardadoIE = {
      id: 2,
      cuentaMensualId: 5,
      numeroCuentaCte: null,
      fechaCreacion: '2026-10-15T12:00:00.000Z',
      subidoPorId: 1,
      subidoPor: null,
      hashContenido: 'a'.repeat(64),
      transacciones: [
        { id: 57, fila: 4, fecha: '2026-03-02', concepto: 'Cobro de tasas' },
        { id: 58, fila: 5, fecha: '2026-03-03', concepto: 'Pago proveedor' },
      ],
    } as unknown as IngresosEgresosGuardado;

    beforeEach(() => {
      datosDeLosLibros();
      vi.mocked(obtenerIngresosEgresos).mockResolvedValue(guardadoIE);
    });

    it('se lista como «Ingresos y Egresos» y su nombre abre sus filas, no las del libro banco con el mismo id', async () => {
      const { user } = renderLibros([...LIBROS, ingresosEgresos]);

      await user.click(
        screen.getByRole('button', { name: 'Ingresos y Egresos' }),
      );

      const pestana = screen.getByRole('tab', { name: 'Ingresos y Egresos' });
      expect(pestana.getAttribute('aria-selected')).toBe('true');
      expect(await screen.findByText('Cobro de tasas')).toBeTruthy();
      expect(screen.queryByText('Proveedor Dos')).toBeNull();
    });

    it('el foco abre su pestaña y marca la fila de la transacción pedida', async () => {
      const { pedirFoco } = renderLibros([...LIBROS, ingresosEgresos]);

      pedirFoco({
        libroTipo: 'INGRESOS_EGRESOS',
        libroId: 2,
        transaccionId: 58,
        clave: 1,
      });

      const fila = (await screen.findByText('Pago proveedor')).closest('tr');
      expect(fila?.getAttribute('aria-current')).toBe('true');
      expect(
        screen
          .getByRole('tab', { name: 'Ingresos y Egresos' })
          .getAttribute('aria-selected'),
      ).toBe('true');
    });
  });
});
