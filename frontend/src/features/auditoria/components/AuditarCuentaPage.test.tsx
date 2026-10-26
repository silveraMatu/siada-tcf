// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listarCuentasMensuales } from '@/features/cuentas/api/cuentas.api';
import type { CuentaMensualListada } from '@/features/cuentas/types';
import { obtenerLibrosBanco } from '@/features/libro-banco/api/libro-banco.api';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import { ejecutarValidaciones } from '../api/auditoria.api';
import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import { AuditarCuentaPage } from './AuditarCuentaPage';

vi.mock('@/features/cuentas/api/cuentas.api', () => ({
  listarCuentasMensuales: vi.fn(),
  presentarCuentaMensual: vi.fn(),
  resolverCuentaMensual: vi.fn(),
}));
vi.mock('@/features/libro-banco/api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));
vi.mock('../api/auditoria.api', () => ({ ejecutarValidaciones: vi.fn() }));

const CUENTA: CuentaMensualListada = {
  id: 5,
  mes: 3,
  cuentaAnualId: 9,
  estado: 'LISTO_PARA_AUDITAR',
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  organismoId: 3,
  organismoNombre: 'Municipalidad de Pirané',
  ejercicioFiscal: 2026,
  libros: [
    {
      id: 2,
      tipo: 'LIBRO_BANCO',
      numeroCuentaCte: '200/2',
      cantidadTransacciones: 3,
      fechaDesde: '2026-03-02',
      fechaHasta: '2026-03-30',
    },
  ],
};

const transaccion = (id: number, aLaOrdenDe: string) => ({
  id,
  fecha: '2026-03-02',
  cheque: null,
  aLaOrdenDe,
  depositos: 0,
  retiro: 0,
  saldo: 0,
});
const GUARDADOS: LibroBancoGuardado[] = [
  {
    id: 2,
    cuentaMensualId: 5,
    numeroCuentaCte: '200/2',
    fechaCreacion: '2026-10-15T12:00:00.000Z',
    transacciones: [
      transaccion(10, 'Base'),
      transaccion(11, 'Cobro'),
      transaccion(12, 'Pago con saldo mal'),
    ],
  },
];

function renderPagina(id = '5') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/auditoria/cuenta/${id}`]}>
        <Routes>
          <Route path="/auditoria/cuenta/:id" element={<AuditarCuentaPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  // jsdom no implementa estas dos: la tabla las usa para llevar al auditor hasta la fila
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AuditarCuentaPage', () => {
  it('muestra a qué rendición se está auditando y el estado en que está', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([CUENTA]);
    renderPagina();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Auditar rendición',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText('Municipalidad de Pirané · Marzo 2026'),
    ).toBeTruthy();
    expect(screen.getByText('Listo para Auditar')).toBeTruthy();
    expect(screen.getByText('1 libro cargado · 3 transacciones')).toBeTruthy();
    // se busca entre todas las cuentas, sin filtrar por estado
    expect(listarCuentasMensuales).toHaveBeenCalledWith();
  });

  it('arriba las validaciones y abajo los libros, como resumen', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([CUENTA]);
    renderPagina();

    expect(
      await screen.findByRole('button', {
        name: 'Ejecutar Validaciones Determinísticas',
      }),
    ).toBeTruthy();
    const lista = screen.getByRole('list', { name: 'Libros de Marzo 2026' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Pago con saldo mal')).toBeNull();
  });

  it('«Ver en el libro» abre la pestaña del libro y marca la fila de la observación', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([CUENTA]);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    vi.mocked(ejecutarValidaciones).mockResolvedValue(MOCK_RESULTADOS);
    const user = renderPagina();
    await user.click(
      await screen.findByRole('button', {
        name: 'Ejecutar Validaciones Determinísticas',
      }),
    );
    await user.click(
      await screen.findByRole('button', { name: /Saldo de cuenta/ }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Ver la fila 3 de Cta. Cte. 200/2 en el libro',
      }),
    );

    const pestana = screen.getByRole('tab', { name: 'Cta. Cte. 200/2' });
    expect(pestana.getAttribute('aria-selected')).toBe('true');
    const fila = (await screen.findByText('Pago con saldo mal')).closest('tr');
    expect(fila?.getAttribute('aria-current')).toBe('true');
    expect(document.activeElement).toBe(fila);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    // las demás filas no quedan marcadas
    expect(
      screen.getByText('Cobro').closest('tr')?.getAttribute('aria-current'),
    ).toBeNull();
  });

  it('una rendición que no existe lo dice y deja volver al listado', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([CUENTA]);
    renderPagina('999');

    expect(await screen.findByText('No se encontró la rendición')).toBeTruthy();
    expect(screen.getByText(/no esté asignado a usted/)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /Volver a las rendiciones pendientes/ })
        .getAttribute('href'),
    ).toBe('/auditoria');
  });

  it('si no se puede cargar la rendición, avisa con la opción de reintentar', async () => {
    vi.mocked(listarCuentasMensuales).mockRejectedValue(
      new Error('Sin conexión'),
    );
    renderPagina();

    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('una rendición sin libros lo indica en vez de una lista vacía', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([
      { ...CUENTA, libros: [] },
    ]);
    renderPagina();

    expect(
      await screen.findByText('Esta rendición no tiene libros cargados.'),
    ).toBeTruthy();
  });
});
