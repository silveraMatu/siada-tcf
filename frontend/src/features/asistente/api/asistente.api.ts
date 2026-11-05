import { api, notificarSesionExpirada } from '@/lib/api';
import { getToken } from '@/lib/auth-token';
import { interpretarEvento, leerEventosSse } from '../lib/sse';
import type {
  ConsultaAsistente,
  EventoAsistente,
  PasoRazonamiento,
  RespuestaAsistente,
} from '../types';

/**
 * El backend corta el flujo a los 120 s con un evento `error`; el cliente espera un poco más para que
 * ese aviso llegue desde el servidor y solo corta por su cuenta si la conexión quedó colgada.
 */
export const TIMEOUT_CONSULTA_MS = 130_000;

export const MENSAJE_SIN_RESPUESTA =
  'El asistente no está disponible en este momento. Intente nuevamente.';

/**
 * Falla de una consulta al copiloto. `estado` es el código HTTP si el servidor rechazó la petición
 * antes de empezar el flujo; es `undefined` si el corte ocurrió con el flujo ya iniciado
 * (evento `error`, conexión caída o tiempo agotado).
 */
export class ErrorAsistente extends Error {
  readonly estado?: number;

  constructor(mensaje: string, estado?: number) {
    super(mensaje);
    this.name = 'ErrorAsistente';
    this.estado = estado;
  }
}

/** Mensaje de un error de Nest (`message` texto o lista) o de validación Zod (`errors[].message`). */
function mensajeDelCuerpo(cuerpo: unknown): string | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const { errors, message } = cuerpo as {
    errors?: { message?: unknown }[];
    message?: unknown;
  };
  if (Array.isArray(errors) && errors.length > 0) {
    const textos = errors
      .map((e) => e.message)
      .filter((m): m is string => typeof m === 'string');
    if (textos.length > 0) return textos.join('. ');
  }
  if (Array.isArray(message)) return message.join('. ');
  return typeof message === 'string' ? message : null;
}

interface OpcionesConsulta {
  /** Para cancelar: el backend corta la llamada a la IA y esta deja de consultar. */
  signal?: AbortSignal;
  /** Se invoca por cada evento válido, en el orden en que llegan. */
  onEvento?: (evento: EventoAsistente) => void;
}

/**
 * `POST /asistente/consultas/stream` (ADMIN o AUDITOR). Devuelve un flujo SSE; se lee con `fetch`
 * porque `EventSource` no permite POST ni el encabezado `Authorization`. Resuelve con la respuesta
 * completa cuando el flujo termina y rechaza con `ErrorAsistente` si el servidor rechaza la petición
 * (400, 401, 403, 404, 502, 503) o el flujo falla a mitad de camino. Cada consulta es independiente:
 * el servidor no guarda historial.
 */
export async function consultarAsistente(
  consulta: ConsultaAsistente,
  { signal, onEvento }: OpcionesConsulta = {},
): Promise<RespuestaAsistente> {
  const controlador = new AbortController();
  const alAbortar = () => controlador.abort();
  signal?.addEventListener('abort', alAbortar);
  if (signal?.aborted) controlador.abort();

  let vencio = false;
  const temporizador = setTimeout(() => {
    vencio = true;
    controlador.abort();
  }, TIMEOUT_CONSULTA_MS);

  try {
    const token = getToken();
    const respuestaHttp = await fetch(
      `${api.defaults.baseURL ?? ''}/asistente/consultas/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(consulta),
        signal: controlador.signal,
      },
    );

    if (!respuestaHttp.ok) {
      if (respuestaHttp.status === 401 && token) notificarSesionExpirada();
      const cuerpo: unknown = await respuestaHttp.json().catch(() => null);
      throw new ErrorAsistente(
        mensajeDelCuerpo(cuerpo) ?? MENSAJE_SIN_RESPUESTA,
        respuestaHttp.status,
      );
    }
    if (!respuestaHttp.body) throw new ErrorAsistente(MENSAJE_SIN_RESPUESTA);

    // cada paso llega dos veces con el mismo id: queda el último estado, en el orden en que apareció
    const pasos = new Map<string, PasoRazonamiento>();
    let respuesta: { texto: string; organismoId: number | null } | null = null;

    for await (const bruto of leerEventosSse(respuestaHttp.body)) {
      const evento = interpretarEvento(bruto);
      if (!evento) continue;
      onEvento?.(evento);

      if (evento.tipo === 'paso') pasos.set(evento.paso.id, evento.paso);
      else if (evento.tipo === 'respuesta') {
        respuesta = {
          texto: evento.respuesta,
          organismoId: evento.organismoId,
        };
      } else if (evento.tipo === 'error') {
        throw new ErrorAsistente(evento.mensaje);
      } else if (evento.tipo === 'fin') break;
    }

    // si la conexión se cortó después de la respuesta, igual alcanza con lo que ya llegó
    if (!respuesta) throw new ErrorAsistente(MENSAJE_SIN_RESPUESTA);
    return {
      respuesta: respuesta.texto,
      organismoId: respuesta.organismoId,
      pasos: [...pasos.values()],
    };
  } catch (error) {
    if (vencio) throw new ErrorAsistente(MENSAJE_SIN_RESPUESTA);
    throw error;
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener('abort', alAbortar);
  }
}
