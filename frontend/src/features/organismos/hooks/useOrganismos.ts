import { useQuery } from '@tanstack/react-query';

import { listarOrganismos } from '../api/organismos.api';

/** Solo los organismos activos: los inactivos no pueden realizar rendiciones. */
export function useOrganismosActivos() {
  return useQuery({
    queryKey: ['organismos'],
    queryFn: listarOrganismos,
    select: (organismos) => organismos.filter((o) => o.active),
  });
}
