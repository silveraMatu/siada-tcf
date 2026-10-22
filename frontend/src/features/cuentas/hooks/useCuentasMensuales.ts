import { useQuery } from '@tanstack/react-query';

import { listarCuentasMensuales } from '../api/cuentas.api';
import { cuentasKeys } from './cuentas.keys';

/**
 * Todas las cuentas mensuales, sin filtrar por estado (ADMIN o AUDITOR). Sirve para ubicar una rendición
 * por id sin depender de en qué estado esté: no hay `GET /cuentas-mensuales/:id`.
 */
export function useCuentasMensuales() {
  return useQuery({
    queryKey: cuentasKeys.todas(),
    queryFn: () => listarCuentasMensuales(),
  });
}
