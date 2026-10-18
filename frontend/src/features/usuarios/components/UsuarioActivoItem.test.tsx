// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { asegurarResponsable } from '@/features/responsables/api/responsables.api';
import { activarUsuario, desactivarUsuario } from '../api/usuarios.api';
import type { Usuario } from '../types';
import { UsuarioActivoItem } from './UsuarioActivoItem';

vi.mock('../api/usuarios.api', () => ({
  activarUsuario: vi.fn(),
  desactivarUsuario: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/features/responsables/api/responsables.api', () => ({
  asegurarResponsable: vi.fn(),
}));

const usuario: Usuario = {
  id: 7,
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '12345678',
  email: 'ana@organismo.gob.ar',
  active: true,
  roles: ['AUDITOR'],
  fechaCreacion: '2026-10-15T12:00:00.000Z',
};

function renderItem(datos: Usuario = usuario) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ul>
        <UsuarioActivoItem usuario={datos} />
      </ul>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const rol = (nombre: string, pressed: boolean) =>
  screen.getByRole('button', { name: nombre, pressed });
const boton = (nombre: string) =>
  screen.getByRole('button', { name: nombre }) as HTMLButtonElement;

beforeEach(() => {
  useAuthStore.setState({
    token: 't',
    user: { sub: 1, email: 'admin@siada.gob.ar', roles: ['ADMIN'] },
    isAuthenticated: true,
  });
  vi.mocked(activarUsuario).mockResolvedValue(usuario);
  vi.mocked(desactivarUsuario).mockResolvedValue({ ...usuario, active: false });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UsuarioActivoItem', () => {
  it('muestra sus roles actuales como seleccionados', () => {
    renderItem({ ...usuario, roles: ['AUDITOR', 'RESPONSABLE'] });
    expect(rol('Auditor', true)).toBeTruthy();
    expect(rol('Responsable', true)).toBeTruthy();
    expect(rol('Administrador', false)).toBeTruthy();
  });

  it('"Actualizar Roles" solo se habilita cuando hay cambios', async () => {
    const user = renderItem();
    expect(boton('Actualizar Roles').disabled).toBe(true);

    await user.click(rol('Responsable', false));
    expect(boton('Actualizar Roles').disabled).toBe(false);

    await user.click(rol('Responsable', true));
    expect(boton('Actualizar Roles').disabled).toBe(true);
  });

  it('no permite dejar al usuario sin roles', async () => {
    const user = renderItem();
    await user.click(rol('Auditor', true));
    expect(boton('Actualizar Roles').disabled).toBe(true);
    expect(screen.getByText('Seleccione al menos un rol')).toBeTruthy();
  });

  it('"Actualizar Roles" envía los roles nuevos', async () => {
    const user = renderItem();
    await user.click(rol('Responsable', false));
    await user.click(boton('Actualizar Roles'));

    await waitFor(() =>
      expect(activarUsuario).toHaveBeenCalledWith(7, ['AUDITOR', 'RESPONSABLE']),
    );
    expect(desactivarUsuario).not.toHaveBeenCalled();
  });

  it('"Desactivar Cuenta" pide confirmación y no llama a la API hasta "Continuar"', async () => {
    const user = renderItem();
    await user.click(boton('Desactivar Cuenta'));

    expect(await screen.findByText('Desactivar cuenta')).toBeTruthy();
    expect(desactivarUsuario).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() =>
      expect(desactivarUsuario).toHaveBeenCalledWith(7, ['AUDITOR']),
    );
  });

  it('desactiva con los roles guardados, no con la selección sin guardar', async () => {
    const user = renderItem();
    await user.click(rol('Responsable', false));
    await user.click(boton('Desactivar Cuenta'));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));

    await waitFor(() =>
      expect(desactivarUsuario).toHaveBeenCalledWith(7, ['AUDITOR']),
    );
  });

  it('"Cancelar" no desactiva', async () => {
    const user = renderItem();
    await user.click(boton('Desactivar Cuenta'));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByText('Desactivar cuenta')).toBeNull());
    expect(desactivarUsuario).not.toHaveBeenCalled();
  });

  it('al agregar el rol RESPONSABLE registra al Responsable', async () => {
    vi.mocked(activarUsuario).mockResolvedValue({
      ...usuario,
      roles: ['AUDITOR', 'RESPONSABLE'],
    });
    vi.mocked(asegurarResponsable).mockResolvedValue(true);
    const user = renderItem();
    await user.click(rol('Responsable', false));
    await user.click(boton('Actualizar Roles'));

    await waitFor(() => expect(asegurarResponsable).toHaveBeenCalledWith(7));
  });

  it('al cambiar a otros roles no toca a los Responsables', async () => {
    vi.mocked(activarUsuario).mockResolvedValue({
      ...usuario,
      roles: ['AUDITOR', 'ADMIN'],
    });
    const user = renderItem();
    await user.click(rol('Administrador', false));
    await user.click(boton('Actualizar Roles'));

    await waitFor(() => expect(activarUsuario).toHaveBeenCalled());
    expect(asegurarResponsable).not.toHaveBeenCalled();
  });

  describe('sobre la propia cuenta', () => {
    const propia: Usuario = { ...usuario, id: 1, roles: ['ADMIN', 'AUDITOR'] };

    it('no se puede desactivar', () => {
      renderItem(propia);
      expect(boton('Desactivar Cuenta').disabled).toBe(true);
      expect(screen.getByText('No puede desactivar su propia cuenta')).toBeTruthy();
    });

    it('no se puede quitar el rol de administrador', async () => {
      const user = renderItem(propia);
      await user.click(rol('Administrador', true));

      expect(boton('Actualizar Roles').disabled).toBe(true);
      expect(
        screen.getByText('No puede quitarse el rol de administrador'),
      ).toBeTruthy();
    });

    it('sí puede cambiar otros roles', async () => {
      const user = renderItem(propia);
      await user.click(rol('Auditor', true));
      expect(boton('Actualizar Roles').disabled).toBe(false);
    });
  });
});
