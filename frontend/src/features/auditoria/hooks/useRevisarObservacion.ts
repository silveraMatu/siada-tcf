import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { revisarObservacion } from '../api/auditoria.api';
import type { DecisionObservacion } from '../types/auditoria.types';
import { auditoriaKeys } from './auditoria.keys';

/** Confirma, descarta o reabre un hallazgo y refresca la ejecución, que trae cada estado y los conteos. */
export function useRevisarObservacion(cuentaMensualId: number) {
  const queryClient = useQueryClient();
  const refrescar = () =>
    queryClient.invalidateQueries({
      queryKey: auditoriaKeys.ejecucion(cuentaMensualId),
    });

  return useMutation({
    mutationFn: ({
      observacionId,
      decision,
      motivo,
    }: {
      observacionId: number;
      decision: DecisionObservacion;
      motivo?: string;
    }) => revisarObservacion(observacionId, decision, motivo),
    onSuccess: refrescar,
    onError: (error) => {
      toast.error(getErrorMessage(error));
      // el 409 por una ejecución anterior o una auditoría ya cerrada se resuelve viendo lo vigente
      void refrescar();
    },
  });
}
