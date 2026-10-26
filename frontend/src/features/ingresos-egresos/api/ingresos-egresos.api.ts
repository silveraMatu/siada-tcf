import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type {
  IngestaIngresosEgresosPayload,
  IngresosEgresosGuardado,
} from '../types';

/** El libro de la rendición, o null si todavía no se cargó (el backend responde 404). */
export async function obtenerIngresosEgresos(
  cuentaMensualId: number,
): Promise<IngresosEgresosGuardado | null> {
  try {
    const { data } = await api.get<IngresosEgresosGuardado>(
      `/cuentas-mensuales/${cuentaMensualId}/ingresos-egresos`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

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
