import type { PersonaResumen } from '@/lib/persona';

/**
 * Asiento del libro RACI en el formato que espera la API. El libro trae solo los asientos del mes:
 * cada uno es una sola etapa (compromiso, devengado o pago) y las otras columnas «del mes» van en 0.
 * No lleva datos de la partida presupuestaria ni número de fila.
 */
export interface TransaccionRaci {
  /** N° de asiento (columna «N° As.»), entero positivo. */
  asiento: number;
  /** YYYY-MM-DD */
  fecha: string;
  expediente?: string;
  concepto: string;
  compromisoInstrumentoLegal?: string;
  compromisoDelMes: number;
  compromisoAcumulado: number;
  compromisoOrdenProvision?: string;
  devengadoDelMes: number;
  devengadoAcumulado: number;
  devengadoSaldo: number;
  devengadoOrdenPago?: string;
  pagoNumeroCheque?: string;
  pagoDelMes: number;
  pagoAcumulado: number;
  pagoSaldoAPagar: number;
}

/** Cuerpo de `POST /cuentas-mensuales/:id/raci/ingestar`. */
export interface IngestaRaciPayload {
  /** Con un libro ya cargado: false lo rechaza (409), true lo reemplaza. */
  reemplazar?: boolean;
  transacciones: TransaccionRaci[];
}

/** Fila del archivo ya transformada, con los problemas que impedirían enviarla. */
export interface FilaRaciPreview {
  /** Número de fila en la planilla (base 1) o, en un libro guardado, posición. No viaja a la API. */
  fila: number;
  /** Id del asiento, solo en un libro ya guardado (permite ubicarlo desde una observación). */
  id?: number;
  /** Partida presupuestaria del bloque, si la planilla la trae. Solo se muestra: no se envía. */
  partida?: string;
  transaccion: TransaccionRaci;
  errores: string[];
}

export interface ResultadoParseoRaci {
  filas: FilaRaciPreview[];
  /** Filas del bloque que no son asientos (en blanco o solo con la base y las fórmulas) y no se envían. */
  omitidas: number;
}

/** Asiento tal como lo devuelve `GET /cuentas-mensuales/:id/raci` (los textos vacíos llegan como null). */
export type TransaccionRaciGuardada = Omit<
  TransaccionRaci,
  | 'expediente'
  | 'compromisoInstrumentoLegal'
  | 'compromisoOrdenProvision'
  | 'devengadoOrdenPago'
  | 'pagoNumeroCheque'
> & {
  id: number;
  expediente: string | null;
  compromisoInstrumentoLegal: string | null;
  compromisoOrdenProvision: string | null;
  devengadoOrdenPago: string | null;
  pagoNumeroCheque: string | null;
};

export interface RaciGuardado {
  id: number;
  cuentaMensualId: number;
  /** Cuándo se subió (ISO). */
  fechaCreacion: string;
  subidoPorId: number;
  /** null si el usuario ya no se puede resolver. */
  subidoPor: PersonaResumen | null;
  /** SHA-256 del contenido recibido, 64 caracteres hexadecimales. */
  hashContenido: string;
  transacciones: TransaccionRaciGuardada[];
}
