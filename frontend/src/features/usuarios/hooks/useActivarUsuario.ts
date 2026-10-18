import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { responsablesKeys } from '@/features/responsables/hooks/responsables.keys';
import { activarUsuario } from '../api/usuarios.api';
import type { Rol } from '../types';
import { registrarResponsableSiCorresponde } from './registrarResponsable';
import { usuariosKeys } from './usuarios.keys';

export function useActivarUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, roles }: { id: number; roles: Rol[] }) => {
      const usuario = await activarUsuario(id, roles);
      await registrarResponsableSiCorresponde(usuario, 'se activó');
      return usuario;
    },
    onSuccess: (usuario) => {
      // Sale de pendientes y pasa a la lista de activos.
      queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
      queryClient.invalidateQueries({ queryKey: responsablesKeys.all });
      toast.success(`${usuario.nombre} ${usuario.apellido} fue activado`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
