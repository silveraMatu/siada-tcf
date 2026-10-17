import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LandingPage } from '@/features/landing/components/LandingPage';
import { LibroBancoPage } from '@/features/libro-banco/components/LibroBancoPage';
import { OrganismosPage } from '@/features/organismos/components/OrganismosPage';
import { ResponsablesPage } from '@/features/responsables/components/ResponsablesPage';

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <DashboardLayout />,
    children: [
      { path: 'organismos', element: <OrganismosPage /> },
      { path: 'responsables', element: <ResponsablesPage /> },
      { path: 'libro-banco', element: <LibroBancoPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
