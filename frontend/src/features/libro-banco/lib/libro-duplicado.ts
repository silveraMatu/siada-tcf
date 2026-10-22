import { isAxiosError } from 'axios';

import type { LibroExistente } from '../types';

/**
 * Si el error es el 409 `LIBRO_DUPLICADO` (ya hay un libro con ese N° de cuenta corriente en la
 * rendición), devuelve los datos del libro existente; para cualquier otro error, null.
 */
export function leerLibroDuplicado(error: unknown): LibroExistente | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const datos: unknown = error.response.data;
  if (typeof datos !== 'object' || datos === null) return null;

  const { codigo, libroExistente } = datos as {
    codigo?: unknown;
    libroExistente?: Partial<LibroExistente> | null;
  };
  if (codigo !== 'LIBRO_DUPLICADO' || !libroExistente) return null;

  return {
    id: Number(libroExistente.id),
    numeroCuentaCte: String(libroExistente.numeroCuentaCte ?? ''),
    fechaCreacion: libroExistente.fechaCreacion ?? null,
    cantidadTransacciones: Number(libroExistente.cantidadTransacciones ?? 0),
  };
}
