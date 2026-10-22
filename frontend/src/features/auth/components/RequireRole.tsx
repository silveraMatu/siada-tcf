import { Navigate, Outlet } from 'react-router-dom';

import { rutaInicial } from '@/components/layout/navigation';
import type { Rol } from '@/features/usuarios/types';
import { useAuthStore } from '../hooks/useAuth';

/**
 * Ruta-layout que deja pasar solo a quien tenga alguno de los roles. Sin sesión va a /login;
 * con sesión pero sin el rol, a su primera sección. La autorización real la hace el backend:
 * esto evita mostrar una pantalla que solo devolvería 403.
 */
export function RequireRole({ roles }: { roles: readonly Rol[] }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.some((rol) => user.roles.includes(rol))) {
    return <Navigate to={rutaInicial(user.roles)} replace />;
  }
  return <Outlet />;
}
