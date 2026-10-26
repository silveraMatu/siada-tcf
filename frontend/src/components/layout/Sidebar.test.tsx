// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { getToken, setToken, TOKEN_KEY } from '@/lib/auth-token';
import type { Rol } from '@/features/usuarios/types';
import { SidebarContent } from './Sidebar';

function sesion(roles: Rol[]) {
  useAuthStore.setState({
    token: 'token',
    user: { sub: 1, email: 'ana@organismo.gob.ar', roles },
    isAuthenticated: true,
  });
}

function renderSidebar() {
  render(
    <MemoryRouter initialEntries={['/organismos']}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="*" element={<SidebarContent />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const enlaces = () => screen.queryAllByRole('link').map((a) => a.textContent);

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
afterEach(cleanup);

describe('Sidebar según el rol', () => {
  it('ADMIN ve gestión y administración, no la ingesta', () => {
    sesion(['ADMIN']);
    renderSidebar();
    expect(enlaces()).toEqual([
      'Organismos',
      'Asignación de auditores',
      'Responsables',
      'Auditoría',
      'Solicitudes de Acceso',
    ]);
  });

  it('RESPONSABLE solo ve la rendición mensual', () => {
    sesion(['RESPONSABLE']);
    renderSidebar();
    expect(enlaces()).toEqual(['Rendición mensual']);
  });

  it('un usuario sin roles no ve ninguna ruta protegida', () => {
    sesion([]);
    renderSidebar();
    expect(enlaces()).toEqual([]);
  });

  it('sin sesión tampoco hay rutas', () => {
    renderSidebar();
    expect(enlaces()).toEqual([]);
  });

  it('muestra el email y los roles del usuario', () => {
    sesion(['AUDITOR', 'RESPONSABLE']);
    renderSidebar();
    expect(screen.getByText('ana@organismo.gob.ar')).toBeTruthy();
    expect(screen.getByText('Auditor · Responsable')).toBeTruthy();
  });
});

describe('Cerrar Sesión', () => {
  it('limpia el token y redirige a /login', async () => {
    sesion(['ADMIN']);
    setToken('token');
    expect(getToken()).toBe('token');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token');

    const user = renderSidebar();
    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(getToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
  });
});
