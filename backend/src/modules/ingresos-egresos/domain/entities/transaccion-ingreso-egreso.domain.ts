//datos de una fila del libro
export interface DatosTransaccionIngresoEgreso {
  fila: number; //número de fila en el archivo original
  fecha: string; //YYYY-MM-DD
  concepto: string;
  cheque: string | null;
  comprobante: string | null;
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
  cuentasVariasConcepto: string | null;
  cuentasVariasDebe: number;
  cuentasVariasHaber: number;
  id?: number;
}

export class TransaccionIngresoEgreso implements DatosTransaccionIngresoEgreso {
  readonly fila: number;
  readonly fecha: string;
  readonly concepto: string;
  readonly cheque: string | null;
  readonly comprobante: string | null;
  readonly cajaDebe: number;
  readonly cajaHaber: number;
  readonly cajaSaldo: number;
  readonly bancoDebe: number;
  readonly bancoHaber: number;
  readonly bancoSaldo: number;
  readonly egresoInc1: number;
  readonly egresoInc2: number;
  readonly egresoInc3: number;
  readonly egresoInc4: number;
  readonly egresoInc5: number;
  readonly ingresoMunicipal: number;
  readonly ingresoOtras: number;
  readonly cuentasVariasConcepto: string | null;
  readonly cuentasVariasDebe: number;
  readonly cuentasVariasHaber: number;
  readonly id?: number;

  constructor(datos: DatosTransaccionIngresoEgreso) {
    this.fila = datos.fila;
    this.fecha = datos.fecha;
    this.concepto = datos.concepto;
    this.cheque = datos.cheque;
    this.comprobante = datos.comprobante;
    this.cajaDebe = datos.cajaDebe;
    this.cajaHaber = datos.cajaHaber;
    this.cajaSaldo = datos.cajaSaldo;
    this.bancoDebe = datos.bancoDebe;
    this.bancoHaber = datos.bancoHaber;
    this.bancoSaldo = datos.bancoSaldo;
    this.egresoInc1 = datos.egresoInc1;
    this.egresoInc2 = datos.egresoInc2;
    this.egresoInc3 = datos.egresoInc3;
    this.egresoInc4 = datos.egresoInc4;
    this.egresoInc5 = datos.egresoInc5;
    this.ingresoMunicipal = datos.ingresoMunicipal;
    this.ingresoOtras = datos.ingresoOtras;
    this.cuentasVariasConcepto = datos.cuentasVariasConcepto;
    this.cuentasVariasDebe = datos.cuentasVariasDebe;
    this.cuentasVariasHaber = datos.cuentasVariasHaber;
    this.id = datos.id;
  }
}
