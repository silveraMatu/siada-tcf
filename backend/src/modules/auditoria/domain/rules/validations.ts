export enum validationsCode {
  V1 = 'V1', //saldo de caja (ingresos y egresos)
  V2 = 'V2', //saldo de banco (ingresos y egresos)
  V3 = 'V3', //saldo de cuenta (libro banco)
  V4 = 'V4', //secuencia lógica del gasto (RACI)
  V5 = 'V5', //límite presupuestario: devengado vs compromiso (RACI)
  V6 = 'V6', //límite de pago: pago vs devengado (RACI)
  C1 = 'C1', //egresos devengados: RACI vs ingresos y egresos
  C2 = 'C2', //egresos pagados: RACI vs ingresos y egresos
  C4 = 'C4', //depósitos: ingresos y egresos vs libro banco
  C5 = 'C5', //retiros: ingresos y egresos vs libro banco
  C6 = 'C6', //saldo final: ingresos y egresos vs libro banco
  P1 = 'P1', //existencia de los cheques del RACI en el libro banco
  P2 = 'P2', //monto de los cheques: RACI vs libro banco
  F1 = 'F1', //fechas dentro del mes de la rendición
}

//texto legible de cada regla; el valor persistido es el código
export const descripcionRegla: Record<validationsCode, string> = {
  [validationsCode.V1]: 'Saldo de caja',
  [validationsCode.V2]: 'Saldo de banco (ingresos y egresos)',
  [validationsCode.V3]: 'Saldo de cuenta',
  [validationsCode.V4]: 'Secuencia lógica del gasto',
  [validationsCode.V5]: 'Límite presupuestario',
  [validationsCode.V6]: 'Límite de pago',
  [validationsCode.C1]: 'Egresos devengados (RACI)',
  [validationsCode.C2]: 'Egresos pagados (RACI)',
  [validationsCode.C4]: 'Depósitos bancarios',
  [validationsCode.C5]: 'Retiros bancarios',
  [validationsCode.C6]: 'Saldo final bancario',
  [validationsCode.P1]: 'Existencia de cheques',
  [validationsCode.P2]: 'Monto de cheques',
  [validationsCode.F1]: 'Coherencia de fechas',
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
  RACI = 'RACI',
}
