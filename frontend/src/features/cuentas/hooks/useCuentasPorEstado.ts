import { useQuery } from '@tanstack/react-query';

import { listarCuentasMensuales } from '../api/cuentas.api';
import type { EstadoCuentaMensual } from '../types';
import { cuentasKeys } from './cuentas.keys';

/** Cuentas mensuales en un estado dado (p. ej. las que esperan auditoría). */
export function useCuentasPorEstado(estado: EstadoCuentaMensual) {
  return useQuery({
    queryKey: cuentasKeys.porEstado(estado),
    queryFn: () => listarCuentasMensuales(estado),
  });
}
