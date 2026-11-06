import { useQuery } from '@tanstack/react-query';

import { obtenerRai } from '../api/rai.api';
import { raiKeys } from './rai.keys';

/** `data` es null cuando la rendición todavía no tiene el libro RAI (es opcional). */
export function useRai(
  cuentaMensualId: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: raiKeys.porCuenta(cuentaMensualId),
    queryFn: () => obtenerRai(cuentaMensualId),
    enabled,
  });
}
