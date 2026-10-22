// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarCuentasMensuales } from '@/features/cuentas/api/cuentas.api';
import type { CuentaMensualListada } from '@/features/cuentas/types';
import { DashboardAuditorPage } from './DashboardAuditorPage';

vi.mock('@/features/cuentas/api/cuentas.api', () => ({
  listarCuentasMensuales: vi.fn(),
}));

const cuenta = (
  id: number,
  organismoNombre: string,
  mes: number,
  ejercicioFiscal: number,
): CuentaMensualListada => ({
  id,
  mes,
  cuentaAnualId: 1,
  estado: 'LISTO_PARA_AUDITAR',
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  organismoId: 1,
  organismoNombre,
  ejercicioFiscal,
});

function renderPagina() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardAuditorPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardAuditorPage', () => {
  it('pide solo las cuentas listas para auditar y las muestra con organismo, mes y año', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([
      cuenta(7, 'Municipalidad de Pirané', 3, 2026),
      cuenta(8, 'Comisión de Fomento', 12, 2025),
    ]);
    renderPagina();

    expect(await screen.findByText('Municipalidad de Pirané')).toBeTruthy();
    expect(screen.getByText('Marzo 2026')).toBeTruthy();
    expect(screen.getByText('Comisión de Fomento')).toBeTruthy();
    expect(screen.getByText('Diciembre 2025')).toBeTruthy();
    expect(screen.getByText('2 rendiciones esperando auditoría')).toBeTruthy();
    expect(vi.mocked(listarCuentasMensuales).mock.calls[0][0]).toBe(
      'LISTO_PARA_AUDITAR',
    );
  });

  it('cada tarjeta enlaza a la auditoría de su cuenta', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([
      cuenta(7, 'Municipalidad de Pirané', 3, 2026),
    ]);
    renderPagina();

    const enlace = await screen.findByRole('link', {
      name: /Auditar Rendición de Municipalidad de Pirané, Marzo 2026/,
    });
    expect(enlace.getAttribute('href')).toBe('/auditoria/cuenta/7');
    expect(screen.getByText('1 rendición esperando auditoría')).toBeTruthy();
  });

  it('muestra un estado vacío cuando no hay rendiciones pendientes', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([]);
    renderPagina();

    expect(
      await screen.findByText('No hay rendiciones esperando auditoría'),
    ).toBeTruthy();
  });

  it('muestra el error del servidor con la opción de reintentar', async () => {
    vi.mocked(listarCuentasMensuales).mockRejectedValue(
      new Error('Sin conexión'),
    );
    renderPagina();

    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});
