import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { leerLibroDuplicado } from '@/features/libro-banco/lib/libro-duplicado';
import { ingestarIngresosEgresos } from '../api/ingresos-egresos.api';
import type { IngestaIngresosEgresosPayload } from '../types';
import { ingresosEgresosKeys } from './ingresos-egresos.keys';

export function useIngestarIngresosEgresos(cuentaMensualId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IngestaIngresosEgresosPayload) =>
      ingestarIngresosEgresos(cuentaMensualId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ingresosEgresosKeys.porCuenta(cuentaMensualId),
      }),
    onError: (error) => {
      // El libro duplicado no es un fallo: el diálogo le ofrece reemplazarlo o rechazar.
      if (leerLibroDuplicado(error)) return;
      toast.error(getErrorMessage(error));
    },
  });
}
