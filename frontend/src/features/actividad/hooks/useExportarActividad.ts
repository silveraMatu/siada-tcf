import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { exportarActividad } from '../api/actividad.api';
import { descargarBlob, nombreDeExportacion } from '../lib/descargar';
import type { FiltrosActividad } from '../types';
import { actividadKeys } from './actividad.keys';

export function useExportarActividad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filtros: FiltrosActividad) => exportarActividad(filtros),
    onSuccess: (csv) => {
      descargarBlob(csv, nombreDeExportacion());
      toast.success('Exportación lista. Quedó registrada en la bitácora.');
      // la propia exportación es un evento nuevo de la bitácora
      void queryClient.invalidateQueries({ queryKey: actividadKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
