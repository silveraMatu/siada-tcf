import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type { IngestaRaciPayload, RaciGuardado } from '../types';

/** El libro RACI de la rendición, o null si todavía no se cargó (el backend responde 404). */
export async function obtenerRaci(
  cuentaMensualId: number,
): Promise<RaciGuardado | null> {
  try {
    const { data } = await api.get<RaciGuardado>(
      `/cuentas-mensuales/${cuentaMensualId}/raci`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** Solo el RESPONSABLE de la cuenta, con la rendición en borrador. 409 si ya hay libro y no se pide reemplazar. */
export async function ingestarRaci(
  cuentaMensualId: number,
  payload: IngestaRaciPayload,
): Promise<unknown> {
  const { data } = await api.post(
    `/cuentas-mensuales/${cuentaMensualId}/raci/ingestar`,
    payload,
  );
  return data;
}
