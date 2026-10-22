import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { libroBancoKeys } from '@/features/libro-banco/hooks/libro-banco.keys';
import { getErrorMessage } from '@/lib/api';
import { presentarCuentaMensual } from '../api/cuentas.api';
import { cuentasKeys } from './cuentas.keys';

/**
 * Presenta la rendición. La cuenta del responsable vive en estado local de la vista (viene de
 * `POST /resolver`, que no es una query), así que quien llama actualiza su copia con el
 * `onSuccess` de `mutate`; acá se invalidan las listas y el libro guardado de esa cuenta.
 */
export function usePresentarCuentaMensual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: presentarCuentaMensual,
    onSuccess: (cuenta) => {
      toast.success(
        'Rendición presentada. Quedó bloqueada para modificaciones.',
      );
      void queryClient.invalidateQueries({ queryKey: cuentasKeys.all });
      void queryClient.invalidateQueries({
        queryKey: libroBancoKeys.porCuenta(cuenta.id),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
