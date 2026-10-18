import { api } from '@/lib/api';
import type { Rol, Usuario } from '../types';

/** Requiere un JWT de ADMIN. */
export async function obtenerUsuariosPendientes(): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios', {
    params: { active: false },
  });
  return data;
}

/** Los roles enviados reemplazan a los actuales; un usuario activo necesita al menos uno. */
export async function activarUsuario(
  id: number,
  roles: Rol[],
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}/activar`, {
    active: true,
    roles,
  });
  return data;
}
