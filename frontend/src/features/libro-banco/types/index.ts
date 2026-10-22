export interface TransaccionPayload {
  fecha?: string;
  cheque?: string;
  aLaOrdenDe: string;
  depositos: number;
  retiro: number;
  saldo: number;
}

export interface IngestaLibroBancoPayload {
  /** Obligatorio: solo puede haber un libro por N° de cuenta corriente en cada rendición. */
  numeroCuentaCte: string;
  /** Con un libro ya cargado para ese N°: false lo rechaza (409), true lo reemplaza. */
  reemplazar?: boolean;
  transacciones: TransaccionPayload[];
}

/** Libro ya cargado con el mismo N° de cuenta, tal como lo informa el 409 `LIBRO_DUPLICADO`. */
export interface LibroExistente {
  id: number;
  numeroCuentaCte: string;
  fechaCreacion: string | null;
  cantidadTransacciones: number;
}

/** Fila del archivo ya transformada, con los problemas que impedirían enviarla. */
export interface FilaPreview {
  /** Número de fila en la planilla (base 1), para ubicar el error. */
  fila: number;
  /** Id de la transacción, solo en filas de un libro ya guardado (permite ubicarla desde una observación). */
  id?: number;
  transaccion: TransaccionPayload;
  errores: string[];
}

/** Transacción tal como la devuelve `GET /cuentas-mensuales/:id/libro-banco`. */
export interface TransaccionGuardada {
  id: number;
  fecha: string | null;
  cheque: string | null;
  aLaOrdenDe: string;
  depositos: number;
  retiro: number;
  saldo: number;
}

export interface LibroBancoGuardado {
  id: number;
  cuentaMensualId: number;
  numeroCuentaCte: string | null;
  fechaCreacion: string;
  transacciones: TransaccionGuardada[];
}

export interface ResultadoParseo {
  numeroCuentaCte?: string;
  filas: FilaPreview[];
}
