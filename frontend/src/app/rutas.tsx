import { Navigate, type RouteObject } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { rolesPermitidos } from '@/components/layout/navigation';
import { AuditarCuentaPage } from '@/features/auditoria/components/AuditarCuentaPage';
import { DashboardAuditorPage } from '@/features/auditoria/components/DashboardAuditorPage';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { RegistroPage } from '@/features/auth/components/RegistroPage';
import { RequireRole } from '@/features/auth/components/RequireRole';
import { SoloSinSesion } from '@/features/auth/components/SoloSinSesion';
import { ActividadPage } from '@/features/actividad/components/ActividadPage';
import { AdminUsuariosPage } from '@/features/usuarios/components/AdminUsuariosPage';
import { LandingPage } from '@/features/landing/components/LandingPage';
import { LibroBancoPage } from '@/features/libro-banco/components/LibroBancoPage';
import { AsignacionAuditoresPage } from '@/features/organismos/components/AsignacionAuditoresPage';
import { OrganismosPage } from '@/features/organismos/components/OrganismosPage';
import { ResponsablesPage } from '@/features/responsables/components/ResponsablesPage';

/**
 * Agrupa las rutas de una sección del menú bajo el guard de sus roles: los mismos que decide
 * `navigation.ts` para mostrar u ocultar el ítem, así el menú y el acceso directo por URL no se desfasan.
 */
const seccion = (rutaDelMenu: string, rutas: RouteObject[]): RouteObject => ({
  element: <RequireRole roles={rolesPermitidos(rutaDelMenu)} />,
  children: rutas,
});

export const rutas: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  {
    // quien ya tiene sesión no necesita ver el login ni el registro
    element: <SoloSinSesion />,
    children: [
      { path: '/registro', element: <RegistroPage /> },
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    element: <DashboardLayout />,
    children: [
      seccion('/organismos', [
        { path: 'organismos', element: <OrganismosPage /> },
      ]),
      seccion('/asignacion-auditores', [
        {
          path: 'asignacion-auditores',
          element: <AsignacionAuditoresPage />,
        },
      ]),
      seccion('/responsables', [
        { path: 'responsables', element: <ResponsablesPage /> },
      ]),
      seccion('/libro-banco', [
        { path: 'libro-banco', element: <LibroBancoPage /> },
      ]),
      seccion('/auditoria', [
        { path: 'auditoria', element: <DashboardAuditorPage /> },
        { path: 'auditoria/cuenta/:id', element: <AuditarCuentaPage /> },
      ]),
      seccion('/admin/usuarios', [
        { path: 'admin/usuarios', element: <AdminUsuariosPage /> },
      ]),
      seccion('/actividad', [
        { path: 'actividad', element: <ActividadPage /> },
      ]),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
