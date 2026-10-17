import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LibroBancoPage } from '@/features/libro-banco/components/LibroBancoPage';
import { OrganismosPage } from '@/features/organismos/components/OrganismosPage';
import { ResponsablesPage } from '@/features/responsables/components/ResponsablesPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="/organismos" replace /> },
      { path: 'organismos', element: <OrganismosPage /> },
      { path: 'responsables', element: <ResponsablesPage /> },
      { path: 'libro-banco', element: <LibroBancoPage /> },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
