import { useQuery } from '@tanstack/react-query';

import { obtenerLibrosBanco } from '../api/libro-banco.api';
import { libroBancoKeys } from './libro-banco.keys';

/** `enabled: false` evita pedir las transacciones hasta que hagan falta. */
export function useLibrosBanco(
  cuentaMensualId: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: libroBancoKeys.porCuenta(cuentaMensualId),
    queryFn: () => obtenerLibrosBanco(cuentaMensualId),
    enabled,
  });
}
