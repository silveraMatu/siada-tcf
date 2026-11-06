import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { leerLibroDuplicado } from '@/features/libro-banco/lib/libro-duplicado';
import { ingestarRai } from '../api/rai.api';
import type { IngestaRaiPayload } from '../types';
import { raiKeys } from './rai.keys';

export function useIngestarRai(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IngestaRaiPayload) =>
      ingestarRai(cuentaMensualId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: raiKeys.porCuenta(cuentaMensualId),
      }),
    onError: (error) => {
      // El libro duplicado no es un fallo: el diálogo le ofrece reemplazarlo o rechazar.
      if (leerLibroDuplicado(error)) return;
      toast.error(getErrorMessage(error));
    },
  });
}
