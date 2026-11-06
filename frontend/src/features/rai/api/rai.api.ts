import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type { IngestaRaiPayload, RaiGuardado } from '../types';

/** El libro RAI de la rendición, o null si todavía no se cargó (el backend responde 404). */
export async function obtenerRai(
  cuentaMensualId: number,
): Promise<RaiGuardado | null> {
  try {
    const { data } = await api.get<RaiGuardado>(
      `/cuentas-mensuales/${cuentaMensualId}/rai`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** Solo el RESPONSABLE de la cuenta, con la rendición en borrador. 409 si ya hay libro y no se pide reemplazar. */
export async function ingestarRai(
  cuentaMensualId: number,
  payload: IngestaRaiPayload,
): Promise<unknown> {
  const { data } = await api.post(
    `/cuentas-mensuales/${cuentaMensualId}/rai/ingestar`,
    payload,
  );
  return data;
}
