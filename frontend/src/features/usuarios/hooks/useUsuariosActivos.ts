import { useQuery } from '@tanstack/react-query';

import { obtenerUsuariosActivos } from '../api/usuarios.api';
import { usuariosKeys } from './usuarios.keys';

export function useUsuariosActivos() {
  return useQuery({
    queryKey: usuariosKeys.activos,
    queryFn: obtenerUsuariosActivos,
    retry: false,
  });
}
