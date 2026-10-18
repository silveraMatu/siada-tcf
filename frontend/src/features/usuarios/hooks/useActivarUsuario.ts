import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { activarUsuario } from '../api/usuarios.api';
import type { Rol } from '../types';
import { usuariosKeys } from './usuarios.keys';

export function useActivarUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: Rol[] }) =>
      activarUsuario(id, roles),
    onSuccess: (usuario) => {
      // Sale de pendientes y pasa a la lista de activos.
      queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
      toast.success(`${usuario.nombre} ${usuario.apellido} fue activado`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
