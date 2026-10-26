import { useInfiniteQuery } from '@tanstack/react-query';

import { listarActividad } from '../api/actividad.api';
import type { FiltrosActividad } from '../types';
import { actividadKeys } from './actividad.keys';

/** La bitácora con esos filtros, página a página por cursor (el servidor no permite saltar). */
export function useActividad(filtros: FiltrosActividad) {
  return useInfiniteQuery({
    queryKey: actividadKeys.lista(filtros),
    queryFn: ({ pageParam }) => listarActividad(filtros, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (ultima) => ultima.siguienteCursor ?? undefined,
  });
}
