import { EstadoCuentaMensual } from '../enums/estado-cuenta-mensual.enum.js';

//lectura para listados: la cuenta mensual con el organismo y el ejercicio a los que pertenece
export class CuentaMensualListada {
  constructor(
    public readonly id: number,
    public readonly mes: number,
    public readonly cuentaAnualId: number,
    public readonly estado: EstadoCuentaMensual,
    public readonly fechaCreacion: Date,
    public readonly organismoId: number,
    public readonly organismoNombre: string,
    public readonly ejercicioFiscal: number,
  ) {}
}
