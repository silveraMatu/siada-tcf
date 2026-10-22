import { EstadoCuentaMensual } from '../enums/estado-cuenta-mensual.enum.js';

export class CuentaMensual {
  constructor(
    public readonly mes: number,
    public readonly cuentaAnualId: number,
    public readonly estado: EstadoCuentaMensual,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}

  //solo en borrador se pueden cargar o modificar documentos: después la evidencia es inmutable
  estaEnBorrador(): boolean {
    return this.estado === EstadoCuentaMensual.EN_BORRADOR;
  }
}
