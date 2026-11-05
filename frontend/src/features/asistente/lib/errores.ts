import { getErrorMessage } from '@/lib/api';
import { ErrorAsistente, MENSAJE_SIN_RESPUESTA } from '../api/asistente.api';

export const MENSAJE_NO_DISPONIBLE =
  'El copiloto no está disponible en este momento. Intente nuevamente en unos minutos.';

export const MENSAJE_CANCELADO =
  'Consulta detenida. Puede reintentarla o hacer otra pregunta.';

/** La persona detuvo la consulta (abortó el `fetch`): no es una falla. */
export function esCancelacion(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Texto amistoso para mostrar en el hilo cuando la consulta falla. Las fallas del servicio de IA
 * (502, 503, sin conexión, flujo cortado) se unifican en un aviso sin jerga; los errores que el
 * usuario puede corregir (pregunta inválida, organismo ajeno, etc.) conservan el mensaje del backend.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorAsistente) {
    const estado = error.estado;
    if (estado === 502 || estado === 503 || estado === 504) {
      return MENSAJE_NO_DISPONIBLE;
    }
    if (estado === 401) {
      return 'Su sesión venció. Inicie sesión de nuevo para consultar al copiloto.';
    }
    // sin estado: el flujo ya empezó y el servidor mandó su propio aviso, que ya es amistoso
    return error.message === MENSAJE_SIN_RESPUESTA
      ? MENSAJE_NO_DISPONIBLE
      : error.message;
  }
  // `fetch` rechaza con TypeError cuando no hay conexión con el servidor
  if (error instanceof TypeError) return MENSAJE_NO_DISPONIBLE;
  return getErrorMessage(error);
}
