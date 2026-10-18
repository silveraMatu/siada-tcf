import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { RegistroPage } from '@/features/auth/components/RegistroPage';
import { AdminUsuariosPage } from '@/features/usuarios/components/AdminUsuariosPage';
import { LandingPage } from '@/features/landing/components/LandingPage';
import { LibroBancoPage } from '@/features/libro-banco/components/LibroBancoPage';
import { OrganismosPage } from '@/features/organismos/components/OrganismosPage';
import { ResponsablesPage } from '@/features/responsables/components/ResponsablesPage';

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/registro', element: <RegistroPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <DashboardLayout />,
    children: [
      { path: 'organismos', element: <OrganismosPage /> },
      { path: 'responsables', element: <ResponsablesPage /> },
      { path: 'libro-banco', element: <LibroBancoPage /> },
      { path: 'admin/usuarios', element: <AdminUsuariosPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
