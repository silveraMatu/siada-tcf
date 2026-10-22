import { api } from '@/lib/api';
import type { ResultadoValidacion } from '../types/auditoria.types';

/**
 * Corre el motor sobre los libros de la rendición. Requiere ADMIN o AUDITOR. Es idempotente: volver a
 * ejecutarlo no duplica las observaciones.
 */
export async function ejecutarValidaciones(
  cuentaMensualId: number,
): Promise<ResultadoValidacion[]> {
  const { data } = await api.post<ResultadoValidacion[]>(
    `/auditoria/cuentas-mensuales/${cuentaMensualId}/libro-banco/ejecutar`,
  );
  return data;
}
