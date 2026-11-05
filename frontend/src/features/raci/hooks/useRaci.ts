import { useQuery } from '@tanstack/react-query';

import { obtenerRaci } from '../api/raci.api';
import { raciKeys } from './raci.keys';

/** `data` es null cuando la rendición todavía no tiene el libro RACI (es opcional). */
export function useRaci(
  cuentaMensualId: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: raciKeys.porCuenta(cuentaMensualId),
    queryFn: () => obtenerRaci(cuentaMensualId),
    enabled,
  });
}
