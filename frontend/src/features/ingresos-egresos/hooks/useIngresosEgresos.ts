import { useQuery } from '@tanstack/react-query';

import { obtenerIngresosEgresos } from '../api/ingresos-egresos.api';
import { ingresosEgresosKeys } from './ingresos-egresos.keys';

/** `data` es null cuando la rendición todavía no tiene el libro de Ingresos y Egresos. */
export function useIngresosEgresos(
  cuentaMensualId: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ingresosEgresosKeys.porCuenta(cuentaMensualId),
    queryFn: () => obtenerIngresosEgresos(cuentaMensualId),
    enabled,
  });
}
