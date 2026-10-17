import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { ingestarLibroBanco } from '../api/libro-banco.api';
import type { IngestaLibroBancoPayload } from '../types';

export function useIngestarLibroBanco(cuentaMensualId: number) {
  return useMutation({
    mutationFn: (payload: IngestaLibroBancoPayload) =>
      ingestarLibroBanco(cuentaMensualId, payload),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
