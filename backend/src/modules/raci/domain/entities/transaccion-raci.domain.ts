//datos de un asiento del RACI (Registro Analítico de Compromisos e Imputaciones), en el orden de las columnas de la planilla
export interface DatosTransaccionRaci {
  asiento: number; //N° de asiento (As.)
  fecha: string; //YYYY-MM-DD
  expediente: string | null; //Expte. N°
  concepto: string;
  //compromiso
  compromisoInstrumentoLegal: string | null;
  compromisoDelMes: number;
  compromisoAcumulado: number;
  compromisoOrdenProvision: string | null;
  //devengado
  devengadoDelMes: number;
  devengadoAcumulado: number;
  devengadoSaldo: number;
  devengadoOrdenPago: string | null;
  //pago
  pagoNumeroCheque: string | null;
  pagoDelMes: number;
  pagoAcumulado: number;
  pagoSaldoAPagar: number;
  id?: number;
}

export class TransaccionRaci implements DatosTransaccionRaci {
  readonly asiento: number;
  readonly fecha: string;
  readonly expediente: string | null;
  readonly concepto: string;
  readonly compromisoInstrumentoLegal: string | null;
  readonly compromisoDelMes: number;
  readonly compromisoAcumulado: number;
  readonly compromisoOrdenProvision: string | null;
  readonly devengadoDelMes: number;
  readonly devengadoAcumulado: number;
  readonly devengadoSaldo: number;
  readonly devengadoOrdenPago: string | null;
  readonly pagoNumeroCheque: string | null;
  readonly pagoDelMes: number;
  readonly pagoAcumulado: number;
  readonly pagoSaldoAPagar: number;
  readonly id?: number;

  constructor(datos: DatosTransaccionRaci) {
    this.asiento = datos.asiento;
    this.fecha = datos.fecha;
    this.expediente = datos.expediente;
    this.concepto = datos.concepto;
    this.compromisoInstrumentoLegal = datos.compromisoInstrumentoLegal;
    this.compromisoDelMes = datos.compromisoDelMes;
    this.compromisoAcumulado = datos.compromisoAcumulado;
    this.compromisoOrdenProvision = datos.compromisoOrdenProvision;
    this.devengadoDelMes = datos.devengadoDelMes;
    this.devengadoAcumulado = datos.devengadoAcumulado;
    this.devengadoSaldo = datos.devengadoSaldo;
    this.devengadoOrdenPago = datos.devengadoOrdenPago;
    this.pagoNumeroCheque = datos.pagoNumeroCheque;
    this.pagoDelMes = datos.pagoDelMes;
    this.pagoAcumulado = datos.pagoAcumulado;
    this.pagoSaldoAPagar = datos.pagoSaldoAPagar;
    this.id = datos.id;
  }
}
