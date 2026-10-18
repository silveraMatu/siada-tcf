import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { activarUsuario } from '../api/usuarios.api';
import type { Rol } from '../types';
import { usuariosKeys } from './usuarios.keys';

/** Reemplaza los roles de un usuario que ya está activo. */
export function useActualizarRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: Rol[] }) =>
      activarUsuario(id, roles),
    onSuccess: (usuario) => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.activos });
      toast.success(
        `Roles de ${usuario.nombre} ${usuario.apellido} actualizados`,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
