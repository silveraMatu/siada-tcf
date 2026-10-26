import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type {
  DecisionObservacion,
  Ejecucion,
  ObservacionApi,
  ResultadoValidacion,
} from '../types/auditoria.types';

/**
 * Audita la rendición: el motor corre sobre sus libros y la ejecución queda guardada en el servidor.
 * Requiere ADMIN o AUDITOR asignado al organismo. Es idempotente: repetirla devuelve la misma ejecución
 * (con las revisiones del auditor) y solo corre de nuevo si cambió la versión de las reglas. La primera
 * vez toma la rendición (LISTO_PARA_AUDITAR → EN_AUDITORIA).
 */
export async function auditarRendicion(
  cuentaMensualId: number,
): Promise<ResultadoValidacion[]> {
  const { data } = await api.post<ResultadoValidacion[]>(
    `/auditoria/cuentas-mensuales/${cuentaMensualId}/documentos/auditar`,
  );
  return data;
}

/**
 * La última ejecución de la auditoría tal como la guarda el servidor, con los resultados de cada regla
 * y cuántas observaciones hay en cada estado; o null si la rendición nunca se auditó (el servidor responde 404).
 */
export async function obtenerEjecucion(
  cuentaMensualId: number,
): Promise<Ejecucion | null> {
  try {
    const { data } = await api.get<Ejecucion>(
      `/auditoria/cuentas-mensuales/${cuentaMensualId}/ejecucion`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Confirma, descarta (con motivo obligatorio) o reabre un hallazgo de la última ejecución, mientras la
 * auditoría está en curso. 409 si la rendición no está en auditoría o si la observación es de una
 * ejecución anterior.
 */
export async function revisarObservacion(
  observacionId: number,
  decision: DecisionObservacion,
  motivo?: string,
): Promise<ObservacionApi> {
  const { data } = await api.patch<ObservacionApi>(
    `/auditoria/observaciones/${observacionId}`,
    { decision, ...(motivo ? { motivo } : {}) },
  );
  return data;
}

/**
 * Cierra la auditoría con la conclusión del auditor. La rendición pasa a AUDITADA si ninguna observación
 * quedó confirmada o a CON_OBSERVACIONES si hay al menos una; 409 si quedan observaciones abiertas.
 */
export async function cerrarAuditoria(
  cuentaMensualId: number,
  conclusion: string,
): Promise<Ejecucion> {
  const { data } = await api.post<Ejecucion>(
    `/auditoria/cuentas-mensuales/${cuentaMensualId}/cerrar`,
    { conclusion },
  );
  return data;
}
