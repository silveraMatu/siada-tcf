import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { rutas } from './rutas';

const router = createBrowserRouter(rutas);

export function Router() {
  return <RouterProvider router={router} />;
}
