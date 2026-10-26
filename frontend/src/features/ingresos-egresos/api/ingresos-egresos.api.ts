import { api } from '@/lib/api';
import type { IngestaIngresosEgresosPayload } from '../types';

export async function ingestarIngresosEgresos(
  cuentaMensualId: number,
  payload: IngestaIngresosEgresosPayload,
): Promise<unknown> {
  const { data } = await api.post(
    `/cuentas-mensuales/${cuentaMensualId}/ingresos-egresos/ingestar`,
    payload,
  );
  return data;
}
