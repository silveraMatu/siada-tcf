import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { responsablesKeys } from '@/features/responsables/hooks/responsables.keys';
import { activarUsuario } from '../api/usuarios.api';
import type { Rol } from '../types';
import { registrarResponsableSiCorresponde } from './registrarResponsable';
import { usuariosKeys } from './usuarios.keys';

/** Reemplaza los roles de un usuario que ya está activo. */
export function useActualizarRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, roles }: { id: number; roles: Rol[] }) => {
      const usuario = await activarUsuario(id, roles);
      await registrarResponsableSiCorresponde(usuario, 'recibió los nuevos roles');
      return usuario;
    },
    onSuccess: (usuario) => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.activos });
      queryClient.invalidateQueries({ queryKey: responsablesKeys.all });
      toast.success(
        `Roles de ${usuario.nombre} ${usuario.apellido} actualizados`,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
