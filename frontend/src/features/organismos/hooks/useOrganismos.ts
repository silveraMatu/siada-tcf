import { useQuery } from '@tanstack/react-query';

import { obtenerOrganismos } from '../api/organismos.api';
import { organismosKeys } from './organismos.keys';

export function useOrganismos() {
  return useQuery({
    queryKey: organismosKeys.all,
    queryFn: obtenerOrganismos,
  });
}

/** Solo los organismos activos: los inactivos no pueden realizar rendiciones. */
export function useOrganismosActivos() {
  return useQuery({
    queryKey: organismosKeys.all,
    queryFn: obtenerOrganismos,
    select: (organismos) => organismos.filter((o) => o.active),
  });
}
