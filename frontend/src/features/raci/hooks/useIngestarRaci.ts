import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { leerLibroDuplicado } from '@/features/libro-banco/lib/libro-duplicado';
import { ingestarRaci } from '../api/raci.api';
import type { IngestaRaciPayload } from '../types';
import { raciKeys } from './raci.keys';

export function useIngestarRaci(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IngestaRaciPayload) =>
      ingestarRaci(cuentaMensualId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: raciKeys.porCuenta(cuentaMensualId),
      }),
    onError: (error) => {
      // El libro duplicado no es un fallo: el diálogo le ofrece reemplazarlo o rechazar.
      if (leerLibroDuplicado(error)) return;
      toast.error(getErrorMessage(error));
    },
  });
}
