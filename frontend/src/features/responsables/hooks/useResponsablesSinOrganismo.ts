import { useQuery } from '@tanstack/react-query';

import { obtenerResponsablesSinOrganismo } from '../api/responsables.api';
import { responsablesKeys } from './responsables.keys';

export function useResponsablesSinOrganismo() {
  return useQuery({
    queryKey: responsablesKeys.sinOrganismo,
    queryFn: obtenerResponsablesSinOrganismo,
    // Un 401/403 no se arregla reintentando.
    retry: false,
  });
}
