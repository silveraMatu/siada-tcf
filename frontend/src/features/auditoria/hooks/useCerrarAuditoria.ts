import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { cuentasKeys } from '@/features/cuentas/hooks/cuentas.keys';
import { getErrorMessage } from '@/lib/api';
import { cerrarAuditoria } from '../api/auditoria.api';
import { auditoriaKeys } from './auditoria.keys';

/** Cierra la auditoría con su conclusión y refresca la ejecución y los listados (el estado de la rendición cambia). */
export function useCerrarAuditoria(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conclusion: string) =>
      cerrarAuditoria(cuentaMensualId, conclusion),
    onSuccess: (ejecucion) => {
      queryClient.setQueryData(
        auditoriaKeys.ejecucion(cuentaMensualId),
        ejecucion,
      );
      void queryClient.invalidateQueries({ queryKey: cuentasKeys.all });
      toast.success('Auditoría cerrada');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      void queryClient.invalidateQueries({
        queryKey: auditoriaKeys.ejecucion(cuentaMensualId),
      });
    },
  });
}
