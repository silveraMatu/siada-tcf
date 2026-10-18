import { api } from '@/lib/api';
import type { Rol, Usuario } from '../types';

/** Requiere un JWT de ADMIN. `active=false` lista los pendientes; `active=true`, los habilitados. */
export async function obtenerUsuarios(active: boolean): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios', { params: { active } });
  return data;
}

export const obtenerUsuariosPendientes = () => obtenerUsuarios(false);
export const obtenerUsuariosActivos = () => obtenerUsuarios(true);

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

/** El usuario queda inactivo (vuelve a pendientes) conservando los roles enviados. */
export async function desactivarUsuario(
  id: number,
  roles: Rol[],
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}/activar`, {
    active: false,
    roles,
  });
  return data;
}
