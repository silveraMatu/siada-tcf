import { useQuery } from '@tanstack/react-query';

import { obtenerUsuariosPendientes } from '../api/usuarios.api';

export const usuariosPendientesKey = ['usuarios', 'pendientes'] as const;

export function useUsuariosPendientes() {
  return useQuery({
    queryKey: usuariosPendientesKey,
    queryFn: obtenerUsuariosPendientes,
    // Un 401/403 no se arregla reintentando.
    retry: false,
  });
}
