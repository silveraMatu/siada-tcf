export interface TransaccionPayload {
  fecha?: string;
  cheque?: string;
  aLaOrdenDe: string;
  depositos: number;
  retiro: number;
  saldo: number;
}

export interface IngestaLibroBancoPayload {
  numeroCuentaCte?: string;
  transacciones: TransaccionPayload[];
}

/** Fila del archivo ya transformada, con los problemas que impedirían enviarla. */
export interface FilaPreview {
  /** Número de fila en la planilla (base 1), para ubicar el error. */
  fila: number;
  transaccion: TransaccionPayload;
  errores: string[];
}

export interface ResultadoParseo {
  numeroCuentaCte?: string;
  filas: FilaPreview[];
}
