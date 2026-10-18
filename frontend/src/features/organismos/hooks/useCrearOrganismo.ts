import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { crearOrganismo } from '../api/organismos.api';
import type { CrearOrganismoValues } from '../types';
import { organismosKeys } from './organismos.keys';

/** Crea un organismo y refresca el listado (y todo selector que lo use). */
export function useCrearOrganismo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CrearOrganismoValues) => crearOrganismo(values),
    onSuccess: (organismo) => {
      queryClient.invalidateQueries({ queryKey: organismosKeys.all });
      toast.success(`Organismo «${organismo.nombre}» creado`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
