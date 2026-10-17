import { api } from '@/lib/api';
import type { CuentaMensual, ResolverCuentaMensualPayload } from '../types';

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
