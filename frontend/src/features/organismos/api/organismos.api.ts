import { api } from '@/lib/api';
import type { CrearOrganismoValues, Organismo } from '../types';

export async function obtenerOrganismos(): Promise<Organismo[]> {
  const { data } = await api.get<Organismo[]>('/organismos');
  return data;
}

/** El estado (`active`) lo define el servidor; solo se envían nombre y rubro. */
export async function crearOrganismo(
  data: CrearOrganismoValues,
): Promise<Organismo> {
  const { data: organismo } = await api.post<Organismo>('/organismos', {
    nombre: data.nombre.trim(),
    rubro: data.rubro.trim(),
  });
  return organismo;
}
