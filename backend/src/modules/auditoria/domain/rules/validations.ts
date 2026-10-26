export enum validationsCode {
  V1 = 'V1', //saldo de caja (ingresos y egresos)
  V2 = 'V2', //saldo de banco (ingresos y egresos)
  V3 = 'V3', //saldo de cuenta (libro banco)
  C4 = 'C4', //depósitos: ingresos y egresos vs libro banco
  C5 = 'C5', //retiros: ingresos y egresos vs libro banco
  C6 = 'C6', //saldo final: ingresos y egresos vs libro banco
}

//texto legible de cada regla; el valor persistido es el código
export const descripcionRegla: Record<validationsCode, string> = {
  [validationsCode.V1]: 'Saldo de caja',
  [validationsCode.V2]: 'Saldo de banco (ingresos y egresos)',
  [validationsCode.V3]: 'Saldo de cuenta',
  [validationsCode.C4]: 'Depósitos bancarios',
  [validationsCode.C5]: 'Retiros bancarios',
  [validationsCode.C6]: 'Saldo final bancario',
};

export enum validationsType {
  INTERNA = 'INTERNA',
  CRUZAMIENTO = 'CRUZAMIENTO',
  INTEGRIDAD = 'INTEGRIDAD',
  SEMANTICA = 'SEMANTICA',
  FECHAS = 'FECHAS',
}

//ciclo de una observación: el motor la deja ABIERTA y el auditor la confirma o la descarta (con motivo)
export enum EstadoObservacion {
  ABIERTA = 'ABIERTA',
  CONFIRMADA = 'CONFIRMADA',
  DESCARTADA = 'DESCARTADA',
}

export enum LibroOrigen {
  LIBRO_BANCO = 'LIBRO_BANCO',
  INGRESOS_EGRESOS = 'INGRESOS_EGRESOS',
}
