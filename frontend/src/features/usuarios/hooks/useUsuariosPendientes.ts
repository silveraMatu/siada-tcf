import { useQuery } from '@tanstack/react-query';

import { obtenerUsuariosPendientes } from '../api/usuarios.api';
import { usuariosKeys } from './usuarios.keys';

export function useUsuariosPendientes() {
  return useQuery({
    queryKey: usuariosKeys.pendientes,
    queryFn: obtenerUsuariosPendientes,
    // Un 401/403 no se arregla reintentando.
    retry: false,
  });
}
