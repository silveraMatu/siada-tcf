import { api } from '@/lib/api';
import type {
  CuentaMensual,
  CuentaMensualListada,
  EstadoCuentaMensual,
  ResolverCuentaMensualPayload,
} from '../types';

/** Envía la rendición a auditoría (EN_BORRADOR → LISTO_PARA_AUDITAR). Solo el responsable del organismo. */
export async function presentarCuentaMensual(
  id: number,
): Promise<CuentaMensual> {
  const { data } = await api.patch<CuentaMensual>(
    `/cuentas-mensuales/${id}/presentar`,
  );
  return data;
}

/** Requiere ADMIN o AUDITOR. Sin `estado` trae todas las cuentas. */
export async function listarCuentasMensuales(
  estado?: EstadoCuentaMensual,
): Promise<CuentaMensualListada[]> {
  const { data } = await api.get<CuentaMensualListada[]>('/cuentas-mensuales', {
    params: estado ? { estado } : undefined,
  });
  return data;
}

/** Idempotente: obtiene la cuenta mensual o la crea si todavía no existe. */
export async function resolverCuentaMensual(
  payload: ResolverCuentaMensualPayload,
): Promise<CuentaMensual> {
  const { data } = await api.post<CuentaMensual>(
    '/cuentas-mensuales/resolver',
    payload,
  );
  return data;
}
