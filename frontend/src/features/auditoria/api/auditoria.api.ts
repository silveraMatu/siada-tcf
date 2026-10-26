import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type { Ejecucion, ResultadoValidacion } from '../types/auditoria.types';

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
