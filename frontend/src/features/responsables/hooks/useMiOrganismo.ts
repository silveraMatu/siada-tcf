import { useQuery } from '@tanstack/react-query';

import { obtenerMiOrganismo } from '../api/responsables.api';
import { responsablesKeys } from './responsables.keys';

/** Organismo del responsable logueado (el servidor lo deduce del token). */
export function useMiOrganismo() {
  return useQuery({
    queryKey: responsablesKeys.miOrganismo,
    queryFn: obtenerMiOrganismo,
    // Un 404/409 (sin organismo asignado, inactivo) no se arregla reintentando.
    retry: false,
  });
}
