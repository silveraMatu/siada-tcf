import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { asignarAuditor, quitarAuditor } from '../api/organismos.api';
import { organismosKeys } from './organismos.keys';

/** Asigna (o cambia) el auditor de un organismo y refresca el listado. */
export function useAsignarAuditor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organismoId,
      auditorId,
    }: {
      organismoId: number;
      auditorId: number;
      /** Solo para el aviso. */
      nombreAuditor: string;
    }) => asignarAuditor(organismoId, auditorId),
    onSuccess: (organismo, { nombreAuditor }) => {
      void queryClient.invalidateQueries({ queryKey: organismosKeys.all });
      toast.success(`${nombreAuditor} audita ahora «${organismo.nombre}»`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useQuitarAuditor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organismoId: number) => quitarAuditor(organismoId),
    onSuccess: (organismo) => {
      void queryClient.invalidateQueries({ queryKey: organismosKeys.all });
      toast.success(`«${organismo.nombre}» quedó sin auditor`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
