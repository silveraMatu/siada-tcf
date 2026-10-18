// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerUsuariosActivos, obtenerUsuariosPendientes } from '../api/usuarios.api';
import type { Usuario } from '../types';
import { AdminUsuariosPage } from './AdminUsuariosPage';

vi.mock('../api/usuarios.api', () => ({
  obtenerUsuariosPendientes: vi.fn(),
  obtenerUsuariosActivos: vi.fn(),
  activarUsuario: vi.fn(),
  desactivarUsuario: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const crear = (id: number, nombre: string, active: boolean): Usuario => ({
  id,
  nombre,
  apellido: 'Test',
  dni: '1234567' + id,
  email: `${nombre.toLowerCase()}@siada.gob.ar`,
  active,
  roles: active ? ['AUDITOR'] : [],
  fechaCreacion: '2026-10-15T12:00:00.000Z',
});

function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminUsuariosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.mocked(obtenerUsuariosPendientes).mockResolvedValue([
    crear(10, 'Pendiente', false),
  ]);
  vi.mocked(obtenerUsuariosActivos).mockResolvedValue([
    crear(20, 'Activa', true),
    crear(21, 'Activo', true),
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminUsuariosPage', () => {
  it('abre en las solicitudes pendientes', async () => {
    renderPagina();
    expect(await screen.findByText('Pendiente Test')).toBeTruthy();
    expect(screen.queryByText('Activa Test')).toBeNull();
    expect(screen.getByRole('button', { name: 'Activar' })).toBeTruthy();
  });

  it('muestra los contadores de cada pestaña', async () => {
    renderPagina();
    await screen.findByText('Pendiente Test');
    expect(
      await screen.findByRole('tab', { name: /Solicitudes Pendientes\s*1/ }),
    ).toBeTruthy();
    expect(
      await screen.findByRole('tab', { name: /Usuarios Activos\s*2/ }),
    ).toBeTruthy();
  });

  it('cambia a los usuarios activos con sus acciones', async () => {
    const user = renderPagina();
    await screen.findByText('Pendiente Test');

    await user.click(screen.getByRole('tab', { name: /Usuarios Activos/ }));

    expect(await screen.findByText('Activa Test')).toBeTruthy();
    expect(screen.getByText('Activo Test')).toBeTruthy();
    expect(screen.queryByText('Pendiente Test')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Desactivar Cuenta' })).toHaveLength(2);
  });

  it('muestra el estado vacío cuando no hay usuarios activos', async () => {
    vi.mocked(obtenerUsuariosActivos).mockResolvedValue([]);
    const user = renderPagina();
    await user.click(screen.getByRole('tab', { name: /Usuarios Activos/ }));
    expect(await screen.findByText('No hay usuarios activos')).toBeTruthy();
  });
});
