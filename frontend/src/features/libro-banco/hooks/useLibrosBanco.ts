import { useQuery } from '@tanstack/react-query';

import { obtenerLibrosBanco } from '../api/libro-banco.api';
import { libroBancoKeys } from './libro-banco.keys';

export function useLibrosBanco(cuentaMensualId: number) {
  return useQuery({
    queryKey: libroBancoKeys.porCuenta(cuentaMensualId),
    queryFn: () => obtenerLibrosBanco(cuentaMensualId),
  });
}
