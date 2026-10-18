// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activarUsuario } from '../api/usuarios.api';
import type { Usuario } from '../types';
import { UsuarioPendienteItem } from './UsuarioPendienteItem';

vi.mock('../api/usuarios.api', () => ({
  activarUsuario: vi.fn(),
  obtenerUsuariosPendientes: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const usuario: Usuario = {
  id: 7,
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '12345678',
  email: 'ana@organismo.gob.ar',
  active: false,
  roles: [],
  fechaCreacion: '2026-10-15T12:00:00.000Z',
};

function renderItem() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ul>
        <UsuarioPendienteItem usuario={usuario} />
      </ul>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const rol = (nombre: string, pressed: boolean) =>
  screen.getByRole('button', { name: nombre, pressed });

beforeEach(() => {
  vi.mocked(activarUsuario).mockResolvedValue({ ...usuario, active: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UsuarioPendienteItem', () => {
  it('los badges de rol funcionan como toggles', async () => {
    const user = renderItem();

    expect(rol('Auditor', false)).toBeTruthy();
    await user.click(rol('Auditor', false));
    expect(rol('Auditor', true)).toBeTruthy();
    await user.click(rol('Auditor', true));
    expect(rol('Auditor', false)).toBeTruthy();
  });

  it('también se activan con el teclado', async () => {
    const user = renderItem();

    rol('Responsable', false).focus();
    await user.keyboard('{Enter}');
    expect(rol('Responsable', true)).toBeTruthy();
    await user.keyboard(' ');
    expect(rol('Responsable', false)).toBeTruthy();
  });

  it('"Activar" está deshabilitado mientras no haya roles', async () => {
    const user = renderItem();
    const activar = screen.getByRole('button', { name: 'Activar' });

    expect((activar as HTMLButtonElement).disabled).toBe(true);
    await user.click(rol('Auditor', false));
    expect((activar as HTMLButtonElement).disabled).toBe(false);
  });

  it('pide confirmación y no llama a la API hasta "Continuar"', async () => {
    const user = renderItem();
    await user.click(rol('Responsable', false));
    await user.click(rol('Auditor', false));
    await user.click(screen.getByRole('button', { name: 'Activar' }));

    expect(await screen.findByText('Confirmar Activación')).toBeTruthy();
    expect(activarUsuario).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() =>
      expect(activarUsuario).toHaveBeenCalledWith(7, ['AUDITOR', 'RESPONSABLE']),
    );
  });

  it('"Cancelar" cierra el diálogo sin activar', async () => {
    const user = renderItem();
    await user.click(rol('Auditor', false));
    await user.click(screen.getByRole('button', { name: 'Activar' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByText('Confirmar Activación')).toBeNull(),
    );
    expect(activarUsuario).not.toHaveBeenCalled();
  });
});
