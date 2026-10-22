import { Navigate, Outlet } from 'react-router-dom';

import { rutaInicial } from '@/components/layout/navigation';
import { useAuthStore } from '../hooks/useAuth';

/**
 * Ruta-layout para el login y el registro: quien ya tiene sesión no necesita verlos y va
 * directo a la primera sección que su menú le permite.
 */
export function SoloSinSesion() {
  const user = useAuthStore((s) => s.user);

  if (user) return <Navigate to={rutaInicial(user.roles)} replace />;
  return <Outlet />;
}
