import { useQuery } from '@tanstack/react-query';

import { obtenerEjecucion } from '../api/auditoria.api';
import { auditoriaKeys } from './auditoria.keys';

/**
 * La última ejecución de la auditoría, guardada en el servidor: se carga al abrir la pantalla sin volver
 * a correr nada. `data` es null si la rendición todavía no se auditó.
 */
export function useEjecucion(cuentaMensualId: number) {
  return useQuery({
    queryKey: auditoriaKeys.ejecucion(cuentaMensualId),
    queryFn: () => obtenerEjecucion(cuentaMensualId),
  });
}
