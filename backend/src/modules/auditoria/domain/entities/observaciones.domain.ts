import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from '../rules/validations.js';

export class Observaciones {
  constructor(
    public readonly cuentaMensualId: number,
    public readonly codigoRegla: validationsCode,
    public readonly tipo: validationsType,
    public readonly descripcion: string,
    public readonly libroOrigen: LibroOrigen,
    public readonly estado: EstadoObservacion,
    public readonly id?: number,
    public readonly transaccionId?: number, //apuntar la fila exacta en la que la transacción falló
    public readonly transaccionIngresoEgresoId?: number, //ídem para una fila del libro de ingresos y egresos
  ) {}
}
