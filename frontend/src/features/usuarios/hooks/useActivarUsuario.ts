import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { activarUsuario } from '../api/usuarios.api';
import type { Rol } from '../types';
import { usuariosPendientesKey } from './useUsuariosPendientes';

export function useActivarUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: Rol[] }) =>
      activarUsuario(id, roles),
    onSuccess: (usuario) => {
      // Al refrescar la lista, el usuario activado deja de aparecer como pendiente.
      queryClient.invalidateQueries({ queryKey: usuariosPendientesKey });
      toast.success(`${usuario.nombre} ${usuario.apellido} fue activado`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
