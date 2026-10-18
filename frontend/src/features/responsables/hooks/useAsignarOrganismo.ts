import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { asignarOrganismo } from '../api/responsables.api';
import { responsablesKeys } from './responsables.keys';

interface AsignarOrganismoVariables {
  responsableId: number;
  organismoId: number;
  /** Solo para el mensaje de éxito. */
  nombre?: string;
  organismoNombre?: string;
}

export function useAsignarOrganismo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ responsableId, organismoId }: AsignarOrganismoVariables) =>
      asignarOrganismo(responsableId, organismoId),
    onSuccess: (_, { nombre, organismoNombre }) => {
      // Deja de ser huérfano: desaparece de la lista.
      queryClient.invalidateQueries({ queryKey: responsablesKeys.all });
      toast.success(
        nombre && organismoNombre
          ? `${nombre} fue vinculado a «${organismoNombre}»`
          : 'Responsable vinculado al organismo',
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
