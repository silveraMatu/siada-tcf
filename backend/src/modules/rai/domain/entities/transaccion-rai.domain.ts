//datos de un asiento del RAI (Registro Analítico de Ingresos), en el orden de las columnas de la planilla
export interface DatosTransaccionRai {
  asiento: number | null; //Asto. N°: en las planillas reales suele venir vacío
  fecha: string; //YYYY-MM-DD (la planilla trae día y mes; el año es el del ejercicio)
  planillaNumero: string | null; //Planilla N°
  concepto: string;
  ingresosDiarios: number;
  ingresosMensuales: number; //acumulado del mes
  ingresosAcumulados: number; //acumulado del ejercicio
  saldo: number; //total autorizado − ingresos acumulados
  id?: number;
}

export class TransaccionRai implements DatosTransaccionRai {
  readonly asiento: number | null;
  readonly fecha: string;
  readonly planillaNumero: string | null;
  readonly concepto: string;
  readonly ingresosDiarios: number;
  readonly ingresosMensuales: number;
  readonly ingresosAcumulados: number;
  readonly saldo: number;
  readonly id?: number;

  constructor(datos: DatosTransaccionRai) {
    this.asiento = datos.asiento;
    this.fecha = datos.fecha;
    this.planillaNumero = datos.planillaNumero;
    this.concepto = datos.concepto;
    this.ingresosDiarios = datos.ingresosDiarios;
    this.ingresosMensuales = datos.ingresosMensuales;
    this.ingresosAcumulados = datos.ingresosAcumulados;
    this.saldo = datos.saldo;
    this.id = datos.id;
  }
}
