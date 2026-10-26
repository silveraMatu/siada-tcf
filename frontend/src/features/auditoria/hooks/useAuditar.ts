import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { cuentasKeys } from '@/features/cuentas/hooks/cuentas.keys';
import { getErrorMessage } from '@/lib/api';
import { auditarRendicion } from '../api/auditoria.api';
import { auditoriaKeys } from './auditoria.keys';

/**
 * Audita la rendición: el auditor la toma (pasa a «En auditoría») y queda guardada su ejecución. Refresca la
 * ejecución y los listados de rendiciones, que ahora la muestran en otro estado.
 */
export function useAuditar(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => auditarRendicion(cuentaMensualId),
    // se espera a que se refresquen para que el botón no vuelva a verse antes de tiempo
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: auditoriaKeys.ejecucion(cuentaMensualId),
        }),
        queryClient.invalidateQueries({ queryKey: cuentasKeys.all }),
      ]),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
