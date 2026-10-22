import { api } from '@/lib/api';
import type { IngestaLibroBancoPayload, LibroBancoGuardado } from '../types';

/** Libros ya guardados de la cuenta mensual (puede haber uno por cuenta corriente). */
export async function obtenerLibrosBanco(
  cuentaMensualId: number,
): Promise<LibroBancoGuardado[]> {
  const { data } = await api.get<LibroBancoGuardado[]>(
    `/cuentas-mensuales/${cuentaMensualId}/libro-banco`,
  );
  return data;
}

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
