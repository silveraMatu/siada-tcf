import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { resolverCuentaMensual } from '../api/cuentas.api';

export function useResolverCuentaMensual() {
  return useMutation({
    mutationFn: resolverCuentaMensual,
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
