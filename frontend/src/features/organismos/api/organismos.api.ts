import { api } from '@/lib/api';
import type { Auditor, CrearOrganismoValues, Organismo } from '../types';

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

/** Candidatos a auditor: usuarios activos con rol AUDITOR. Requiere JUEZ_TRAMITE o ADMIN. */
export async function obtenerAuditores(): Promise<Auditor[]> {
  const { data } = await api.get<Auditor[]>('/organismos/auditores');
  return data;
}

/**
 * Un organismo tiene un auditor a la vez: asignar a otro reemplaza al anterior. 404 si el organismo
 * o el usuario no existen; 409 si el organismo está inactivo o el usuario no es un auditor activo.
 */
export async function asignarAuditor(
  organismoId: number,
  auditorId: number,
): Promise<Organismo> {
  const { data } = await api.put<Organismo>(
    `/organismos/${organismoId}/auditor`,
    { auditorId },
  );
  return data;
}

/** 409 si el organismo no tenía auditor. */
export async function quitarAuditor(organismoId: number): Promise<Organismo> {
  const { data } = await api.delete<Organismo>(
    `/organismos/${organismoId}/auditor`,
  );
  return data;
}
