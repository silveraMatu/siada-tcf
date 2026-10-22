// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { Rol } from '@/features/usuarios/types';
import { useAuthStore } from '../hooks/useAuth';
import { RequireRole } from './RequireRole';

function sesion(roles: Rol[] | null) {
  useAuthStore.setState(
    roles
      ? {
          token: 'token',
          user: { sub: 1, email: 'a@b.gob.ar', roles },
          isAuthenticated: true,
        }
      : { token: null, user: null, isAuthenticated: false },
  );
}

function renderRuta() {
  render(
    <MemoryRouter initialEntries={['/auditoria']}>
      <Routes>
        <Route element={<RequireRole roles={['AUDITOR', 'ADMIN']} />}>
          <Route path="/auditoria" element={<p>Panel del auditor</p>} />
        </Route>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="/libro-banco" element={<p>Ingesta</p>} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sesion(null);
});

describe('RequireRole', () => {
  it('sin sesión redirige a /login', () => {
    sesion(null);
    renderRuta();
    expect(screen.getByText('Pantalla de login')).toBeTruthy();
  });

  it('con un rol que no alcanza redirige a su primera sección', () => {
    sesion(['RESPONSABLE']);
    renderRuta();
    expect(screen.getByText('Ingesta')).toBeTruthy();
    expect(screen.queryByText('Panel del auditor')).toBeNull();
  });

  it('un JUEZ_TRAMITE no accede al panel de auditoría', () => {
    sesion(['JUEZ_TRAMITE']);
    renderRuta();
    // Su primera sección (/organismos) no existe en este árbol de prueba; solo importa que no vea el panel.
    expect(screen.queryByText('Panel del auditor')).toBeNull();
  });

  it.each([['AUDITOR'], ['ADMIN']] as const)('deja pasar al %s', (rol) => {
    sesion([rol]);
    renderRuta();
    expect(screen.getByText('Panel del auditor')).toBeTruthy();
  });

  it('deja pasar si uno de varios roles alcanza', () => {
    sesion(['RESPONSABLE', 'AUDITOR']);
    renderRuta();
    expect(screen.getByText('Panel del auditor')).toBeTruthy();
  });
});
