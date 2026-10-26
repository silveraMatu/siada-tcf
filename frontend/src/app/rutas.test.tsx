// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/features/auth/hooks/useAuth';
import type { Rol } from '@/features/usuarios/types';
import { rutas } from './rutas';

// Las pantallas se reemplazan por un rótulo: acá solo se prueba quién llega a cuál.
vi.mock('@/components/layout/DashboardLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { DashboardLayout: () => <Outlet /> };
});
vi.mock('@/features/landing/components/LandingPage', () => ({
  LandingPage: () => <p>pantalla landing</p>,
}));
vi.mock('@/features/auth/components/LoginPage', () => ({
  LoginPage: () => <p>pantalla login</p>,
}));
vi.mock('@/features/auth/components/RegistroPage', () => ({
  RegistroPage: () => <p>pantalla registro</p>,
}));
vi.mock('@/features/organismos/components/OrganismosPage', () => ({
  OrganismosPage: () => <p>pantalla organismos</p>,
}));
vi.mock('@/features/organismos/components/AsignacionAuditoresPage', () => ({
  AsignacionAuditoresPage: () => <p>pantalla asignación</p>,
}));
vi.mock('@/features/responsables/components/ResponsablesPage', () => ({
  ResponsablesPage: () => <p>pantalla responsables</p>,
}));
vi.mock('@/features/libro-banco/components/LibroBancoPage', () => ({
  LibroBancoPage: () => <p>pantalla libro banco</p>,
}));
vi.mock('@/features/auditoria/components/DashboardAuditorPage', () => ({
  DashboardAuditorPage: () => <p>pantalla panel auditor</p>,
}));
vi.mock('@/features/auditoria/components/AuditarCuentaPage', () => ({
  AuditarCuentaPage: () => <p>pantalla auditar cuenta</p>,
}));
vi.mock('@/features/actividad/components/ActividadPage', () => ({
  ActividadPage: () => <p>pantalla bitácora</p>,
}));
vi.mock('@/features/usuarios/components/AdminUsuariosPage', () => ({
  AdminUsuariosPage: () => <p>pantalla usuarios</p>,
}));

function iniciarSesion(roles: Rol[] | null) {
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

/** Abre la app en `ruta` con esa sesión y devuelve la ruta donde terminó. */
function abrir(ruta: string, roles: Rol[] | null): string {
  iniciarSesion(roles);
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
  return router.state.location.pathname;
}

afterEach(() => {
  cleanup();
  iniciarSesion(null);
});

describe('rutas del panel', () => {
  describe('sin sesión', () => {
    it.each([
      '/organismos',
      '/asignacion-auditores',
      '/responsables',
      '/libro-banco',
      '/auditoria',
      '/auditoria/cuenta/3',
      '/admin/usuarios',
      '/actividad',
    ])('%s lleva al login', (ruta) => {
      expect(abrir(ruta, null)).toBe('/login');
      expect(screen.getByText('pantalla login')).toBeTruthy();
    });

    it('el login, el registro y la landing se ven sin sesión', () => {
      expect(abrir('/login', null)).toBe('/login');
      cleanup();
      expect(abrir('/registro', null)).toBe('/registro');
      cleanup();
      expect(abrir('/', null)).toBe('/');
    });
  });

  describe('con el rol correcto', () => {
    it.each([
      ['/organismos', 'ADMIN', 'pantalla organismos'],
      ['/organismos', 'JUEZ_TRAMITE', 'pantalla organismos'],
      ['/asignacion-auditores', 'JUEZ_TRAMITE', 'pantalla asignación'],
      ['/asignacion-auditores', 'ADMIN', 'pantalla asignación'],
      ['/responsables', 'ADMIN', 'pantalla responsables'],
      ['/libro-banco', 'RESPONSABLE', 'pantalla libro banco'],
      ['/auditoria', 'AUDITOR', 'pantalla panel auditor'],
      ['/auditoria', 'ADMIN', 'pantalla panel auditor'],
      ['/auditoria/cuenta/3', 'AUDITOR', 'pantalla auditar cuenta'],
      ['/admin/usuarios', 'ADMIN', 'pantalla usuarios'],
      ['/actividad', 'SUPERVISOR', 'pantalla bitácora'],
    ] as const)('%s lo ve un %s', (ruta, rol, pantalla) => {
      expect(abrir(ruta, [rol])).toBe(ruta);
      expect(screen.getByText(pantalla)).toBeTruthy();
    });
  });

  describe('con un rol que no corresponde va a su primera sección', () => {
    it.each([
      ['/organismos', 'AUDITOR', '/auditoria'],
      ['/organismos', 'RESPONSABLE', '/libro-banco'],
      ['/responsables', 'JUEZ_TRAMITE', '/organismos'],
      ['/asignacion-auditores', 'AUDITOR', '/auditoria'],
      ['/asignacion-auditores', 'RESPONSABLE', '/libro-banco'],
      ['/libro-banco', 'ADMIN', '/organismos'],
      ['/auditoria', 'RESPONSABLE', '/libro-banco'],
      ['/auditoria/cuenta/3', 'JUEZ_TRAMITE', '/organismos'],
      ['/admin/usuarios', 'RESPONSABLE', '/libro-banco'],
      ['/admin/usuarios', 'AUDITOR', '/auditoria'],
      ['/actividad', 'ADMIN', '/organismos'],
      ['/actividad', 'AUDITOR', '/auditoria'],
      ['/organismos', 'SUPERVISOR', '/actividad'],
    ] as const)('%s con rol %s termina en %s', (ruta, rol, destino) => {
      expect(abrir(ruta, [rol])).toBe(destino);
    });
  });

  describe('con sesión iniciada', () => {
    it.each([
      ['/login', 'RESPONSABLE', '/libro-banco'],
      ['/registro', 'AUDITOR', '/auditoria'],
      ['/login', 'ADMIN', '/organismos'],
      ['/login', 'SUPERVISOR', '/actividad'],
    ] as const)('%s lleva a un %s a %s', (ruta, rol, destino) => {
      expect(abrir(ruta, [rol])).toBe(destino);
    });

    it('un usuario sin ninguna sección visible no queda en bucle: va a la landing', () => {
      expect(abrir('/organismos', [])).toBe('/');
      cleanup();
      expect(abrir('/login', [])).toBe('/');
    });
  });

  it('una ruta inexistente va a la landing', () => {
    expect(abrir('/no-existe', ['ADMIN'])).toBe('/');
  });

  it('si la sesión se cierra estando en una pantalla del panel, se pasa al login', async () => {
    abrir('/libro-banco', ['RESPONSABLE']);
    expect(screen.getByText('pantalla libro banco')).toBeTruthy();

    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });

    expect(await screen.findByText('pantalla login')).toBeTruthy();
  });
});
