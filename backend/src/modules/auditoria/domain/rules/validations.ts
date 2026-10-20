export enum validationsCode {
  V3 = 'V3', //saldo de cuenta (libro banco)
}

//texto legible de cada regla; el valor persistido es el código
export const descripcionRegla: Record<validationsCode, string> = {
  [validationsCode.V3]: 'Saldo de cuenta',
};

export enum validationsType {
  INTERNA = 'INTERNA',
  CRUZAMIENTO = 'CRUZAMIENTO',
  INTEGRIDAD = 'INTEGRIDAD',
  SEMANTICA = 'SEMANTICA',
  FECHAS = 'FECHAS',
}

export enum EstadoObservacion {
  ABIERTA = 'ABIERTA',
  RESUELTA = 'RESUELTA',
  DESCARTADA = 'DESCARTADA',
}

export enum LibroOrigen {
  LIBRO_BANCO = 'LIBRO_BANCO',
}
