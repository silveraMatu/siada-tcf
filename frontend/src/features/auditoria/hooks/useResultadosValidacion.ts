import { skipToken, useQuery } from '@tanstack/react-query';

import type { EjecucionValidaciones } from '../types/auditoria.types';
import { auditoriaKeys } from './auditoria.keys';

/**
 * Último resultado ejecutado en esta sesión. No hay nada que pedirle al servidor (los resultados del
 * motor no se guardan), así que la query no busca nada: solo guarda lo que deja `useEjecutarValidaciones`.
 * Se conserva mientras dure la sesión; al recargar la página se vuelve al estado vacío.
 */
export function useResultadosValidacion(cuentaMensualId: number) {
  return useQuery<EjecucionValidaciones | null>({
    queryKey: auditoriaKeys.resultados(cuentaMensualId),
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
