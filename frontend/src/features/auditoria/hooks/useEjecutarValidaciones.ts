import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ejecutarValidaciones } from '../api/auditoria.api';
import type { EjecucionValidaciones } from '../types/auditoria.types';
import { auditoriaKeys } from './auditoria.keys';

/** Ejecuta las validaciones de la rendición y deja el resultado en la sesión (ver `useResultadosValidacion`). */
export function useEjecutarValidaciones(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ejecutarValidaciones(cuentaMensualId),
    onSuccess: (resultados) => {
      const ejecucion: EjecucionValidaciones = {
        resultados,
        ejecutadoEn: Date.now(),
      };
      queryClient.setQueryData(
        auditoriaKeys.resultados(cuentaMensualId),
        ejecucion,
      );
    },
  });
}
