import { api } from '@/lib/api';
import type { IngestaLibroBancoPayload } from '../types';

export async function ingestarLibroBanco(
  cuentaMensualId: number,
  payload: IngestaLibroBancoPayload,
): Promise<unknown> {
  const { data } = await api.post(
    `/cuentas-mensuales/${cuentaMensualId}/libro-banco/ingestar`,
    payload,
  );
  return data;
}
