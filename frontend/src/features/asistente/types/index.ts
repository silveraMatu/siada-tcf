export type EstadoPaso =
  | 'en_curso'
  | 'completado'
  | 'sin_resultados'
  | 'error'
  // puede llegar un estado nuevo que aún no conocemos
  | (string & {});

/**
 * Un paso del razonamiento de la IA, contado en lenguaje de negocio: qué buscó, en qué áreas y qué
 * encontró. Nunca trae SQL, tablas, columnas ni filas. Todo es texto plano: se pinta tal cual.
 * Cada paso llega dos veces con el mismo `id`: primero `en_curso` y luego con su estado final.
 */
export interface PasoRazonamiento {
  id: string;
  /** Hoy siempre `consulta_datos`; puede llegar otra que aún no conocemos. */
  accion: string;
  /** Lo que busca el agente, p. ej. «Total de depósitos del libro banco de febrero». */
  descripcion: string;
  /** Áreas consultadas en palabras de negocio, p. ej. «libro banco». */
  fuentes: string[];
  estado: EstadoPaso;
  /** P. ej. «Encontré 3 registros»; null mientras el paso sigue en curso. */
  resultado: string | null;
  /** Null si el paso falló o sigue en curso. */
  cantidadRegistros: number | null;
  duracionMs: number | null;
  /** Había más registros que los que analizó el agente (tope de 50). */
  parcial: boolean;
}

export interface MensajeChat {
  id: string;
  rol: 'user' | 'assistant';
  /** Las respuestas del asistente pueden traer Markdown. */
  contenido: string;
  pasos?: PasoRazonamiento[];
  /** El mensaje del asistente es un aviso de falla o de cancelación, no una respuesta del modelo. */
  esError?: boolean;
}

export interface ConsultaAsistente {
  pregunta: string;
  organismoId?: number;
  cuentaMensualId?: number;
}

export interface RespuestaAsistente {
  respuesta: string;
  /** Null si el auditor no tiene ningún organismo asignado: el texto es un aviso fijo del backend. */
  organismoId: number | null;
  /** Solo los estados finales, en orden; `[]` si el modelo no consultó nada. */
  pasos: PasoRazonamiento[];
}

/** Eventos del stream `POST /asistente/consultas/stream`, ya validados. */
export type EventoAsistente =
  | { tipo: 'pensando'; mensaje: string }
  | { tipo: 'paso'; paso: PasoRazonamiento }
  | { tipo: 'respuesta'; respuesta: string; organismoId: number | null }
  | { tipo: 'fin' }
  | { tipo: 'error'; mensaje: string };
