import { api } from '@/lib/api';
import type { ResultadoValidacion } from '../types/auditoria.types';

/**
 * Audita la rendición: el motor corre sobre sus libros y la ejecución queda guardada en el servidor.
 * Requiere ADMIN o AUDITOR asignado al organismo. Es idempotente: repetirla devuelve la misma ejecución
 * (con las revisiones del auditor) y solo corre de nuevo si cambió la versión de las reglas. La primera
 * vez toma la rendición (LISTO_PARA_AUDITAR → EN_AUDITORIA).
 */
export async function ejecutarValidaciones(
  cuentaMensualId: number,
): Promise<ResultadoValidacion[]> {
  const { data } = await api.post<ResultadoValidacion[]>(
    `/auditoria/cuentas-mensuales/${cuentaMensualId}/documentos/auditar`,
  );
  return data;
}
