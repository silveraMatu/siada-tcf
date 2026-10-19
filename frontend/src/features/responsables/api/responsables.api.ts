import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type { Organismo } from '@/features/organismos/types';
import type { Responsable } from '../types';

/** Requiere un JWT de ADMIN. */
export async function obtenerResponsablesSinOrganismo(): Promise<
  Responsable[]
> {
  const { data } = await api.get<Responsable[]>('/responsables', {
    params: { sinOrganismo: true },
  });
  return data;
}

/**
 * Organismo del responsable autenticado. Requiere el rol RESPONSABLE; responde
 * 404 si no tiene Responsable y 409 si está inactivo o sin organismo activo.
 */
export async function obtenerMiOrganismo(): Promise<Organismo> {
  const { data } = await api.get<Organismo>('/responsables/me/organismo');
  return data;
}

/** Requiere un JWT de ADMIN. El responsable y el organismo deben estar activos. */
export async function asignarOrganismo(
  responsableId: number,
  organismoId: number,
): Promise<unknown> {
  const { data } = await api.patch(`/responsables/${responsableId}/organismo`, {
    organismoId,
  });
  return data;
}

export async function crearResponsable(usuarioId: number): Promise<unknown> {
  const { data } = await api.post('/responsables', { usuarioId });
  return data;
}

/**
 * Crea el Responsable de un usuario con rol RESPONSABLE si todavía no tiene uno.
 * Devuelve `true` si lo creó y `false` si ya existía (el backend responde 409).
 */
export async function asegurarResponsable(usuarioId: number): Promise<boolean> {
  try {
    await crearResponsable(usuarioId);
    return true;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) return false;
    throw error;
  }
}
