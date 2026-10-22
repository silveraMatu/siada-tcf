import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { ingestarLibroBanco } from '../api/libro-banco.api';
import { leerLibroDuplicado } from '../lib/libro-duplicado';
import type { IngestaLibroBancoPayload } from '../types';
import { libroBancoKeys } from './libro-banco.keys';

export function useIngestarLibroBanco(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IngestaLibroBancoPayload) =>
      ingestarLibroBanco(cuentaMensualId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: libroBancoKeys.porCuenta(cuentaMensualId),
      }),
    onError: (error) => {
      // El libro duplicado no es un fallo: el diálogo le ofrece al usuario reemplazarlo o rechazar.
      if (leerLibroDuplicado(error)) return;
      toast.error(getErrorMessage(error));
    },
  });
}
