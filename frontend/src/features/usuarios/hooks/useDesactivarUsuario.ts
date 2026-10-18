import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { desactivarUsuario } from '../api/usuarios.api';
import type { Rol } from '../types';
import { usuariosKeys } from './usuarios.keys';

export function useDesactivarUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: Rol[] }) =>
      desactivarUsuario(id, roles),
    onSuccess: (usuario) => {
      // Sale de activos y reaparece en pendientes.
      queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
      toast.success(`${usuario.nombre} ${usuario.apellido} fue desactivado`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
