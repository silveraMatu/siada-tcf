import type { PersonaResumen } from '@/lib/persona';

/** Fila del libro de Ingresos y Egresos, en el formato que espera la API. */
export interface TransaccionIngresoEgreso {
  /** Número de fila en la planilla original (base 1). */
  fila: number;
  /** YYYY-MM-DD */
  fecha: string;
  concepto: string;
  cheque?: string;
  comprobante?: string;
  cajaDebe: number;
  cajaHaber: number;
  cajaSaldo: number;
  bancoDebe: number;
  bancoHaber: number;
  bancoSaldo: number;
  egresoInc1: number;
  egresoInc2: number;
  egresoInc3: number;
  egresoInc4: number;
  egresoInc5: number;
  ingresoMunicipal: number;
  ingresoOtras: number;
  cuentasVariasConcepto?: string;
  cuentasVariasDebe: number;
  cuentasVariasHaber: number;
}

/** Cuerpo de `POST /cuentas-mensuales/:id/ingresos-egresos/ingestar`. */
export interface IngestaIngresosEgresosPayload {
  /** Informativo: el libro de Ingresos y Egresos es uno solo por rendición. */
  numeroCuentaCte?: string;
  /** Con un libro ya cargado: false lo rechaza (409), true lo reemplaza. */
  reemplazar?: boolean;
  transacciones: TransaccionIngresoEgreso[];
}

/** Fila del archivo ya transformada, con los problemas que impedirían enviarla. */
export interface FilaIngresoEgresoPreview {
  /** Id de la transacción, solo en filas de un libro ya guardado (permite ubicarla desde una observación). */
  id?: number;
  transaccion: TransaccionIngresoEgreso;
  errores: string[];
}

export interface ResultadoParseoIngresosEgresos {
  filas: FilaIngresoEgresoPreview[];
}

/** Fila tal como la devuelve `GET /cuentas-mensuales/:id/ingresos-egresos` (los textos vacíos llegan como null). */
export type TransaccionIngresoEgresoGuardada = Omit<
  TransaccionIngresoEgreso,
  'cheque' | 'comprobante' | 'cuentasVariasConcepto'
> & {
  id: number;
  cheque: string | null;
  comprobante: string | null;
  cuentasVariasConcepto: string | null;
};

export interface IngresosEgresosGuardado {
  id: number;
  cuentaMensualId: number;
  numeroCuentaCte: string | null;
  /** Cuándo se subió (ISO). */
  fechaCreacion: string;
  subidoPorId: number;
  /** null si el usuario ya no se puede resolver. */
  subidoPor: PersonaResumen | null;
  /** SHA-256 del contenido recibido, 64 caracteres hexadecimales. */
  hashContenido: string;
  transacciones: TransaccionIngresoEgresoGuardada[];
}
