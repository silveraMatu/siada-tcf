import type { PersonaResumen } from '@/lib/persona';

/**
 * Asiento del libro RAI (registro analítico de ingresos) en el formato que espera la API. El libro
 * trae solo los asientos del mes. No lleva datos de la partida presupuestaria ni número de fila.
 */
export interface TransaccionRai {
  /** N° de asiento (columna «Asto. N°»). Opcional: las planillas reales lo traen vacío y no se inventa. */
  asiento?: number;
  /** YYYY-MM-DD: la planilla trae día y mes, y el año es el del ejercicio de la rendición. */
  fecha: string;
  planillaNumero?: string;
  concepto: string;
  ingresosDiarios: number;
  /** Acumulado del mes. */
  ingresosMensuales: number;
  /** Acumulado del ejercicio. */
  ingresosAcumulados: number;
  /** Total autorizado menos los acumulados. */
  saldo: number;
}

/** Cuerpo de `POST /cuentas-mensuales/:id/rai/ingestar`. */
export interface IngestaRaiPayload {
  /** Con un libro ya cargado: false lo rechaza (409), true lo reemplaza. */
  reemplazar?: boolean;
  transacciones: TransaccionRai[];
}

/** Fila del archivo ya transformada, con los problemas que impedirían enviarla. */
export interface FilaRaiPreview {
  /** Número de fila en la planilla (base 1) o, en un libro guardado, posición. No viaja a la API. */
  fila: number;
  /** Id del asiento, solo en un libro ya guardado (permite ubicarlo desde una observación). */
  id?: number;
  transaccion: TransaccionRai;
  errores: string[];
}

export interface ResultadoParseoRai {
  filas: FilaRaiPreview[];
  /** Filas que no son asientos (la de «transporte» y las sin usar, que solo traen fórmulas) y no se envían. */
  omitidas: number;
  /** Ejercicio que dice el encabezado de la planilla («EJERCICIO FISCAL 2025»), si lo trae. Solo sirve para avisar. */
  ejercicioDeLaPlanilla?: number;
}

/** Asiento tal como lo devuelve `GET /cuentas-mensuales/:id/rai` (el N° y la planilla vacíos llegan como null). */
export type TransaccionRaiGuardada = Omit<
  TransaccionRai,
  'asiento' | 'planillaNumero'
> & {
  id: number;
  asiento: number | null;
  planillaNumero: string | null;
};

export interface RaiGuardado {
  id: number;
  cuentaMensualId: number;
  /** Cuándo se subió (ISO). */
  fechaCreacion: string;
  subidoPorId: number;
  /** null si el usuario ya no se puede resolver. */
  subidoPor: PersonaResumen | null;
  /** SHA-256 del contenido recibido, 64 caracteres hexadecimales. */
  hashContenido: string;
  transacciones: TransaccionRaiGuardada[];
}
