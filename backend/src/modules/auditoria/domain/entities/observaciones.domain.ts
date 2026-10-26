import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from '../rules/validations.js';

export interface DatosObservacion {
  cuentaMensualId: number;
  codigoRegla: validationsCode;
  tipo: validationsType;
  descripcion: string;
  libroOrigen: LibroOrigen;
  estado: EstadoObservacion;
  id?: number;
  //ejecución de auditoría que la produjo
  ejecucionId?: number;
  transaccionId?: number; //fila exacta del libro banco en la que falló
  transaccionIngresoEgresoId?: number; //ídem para una fila del libro de ingresos y egresos
  //los importes del hallazgo, para sumarlos y compararlos sin leer el texto: lo que informa el libro auditado,
  //lo que debería ser y la diferencia (siempre positiva)
  valorInformado?: number;
  valorCalculado?: number;
  diferencia?: number;
  //revisión del auditor
  motivoDescarte?: string;
  revisadaPorId?: number;
  revisadaEn?: Date;
}

//un hallazgo de una regla; se arma con un objeto porque tiene demasiados campos para parámetros posicionales
export class Observaciones implements DatosObservacion {
  readonly cuentaMensualId: number;
  readonly codigoRegla: validationsCode;
  readonly tipo: validationsType;
  readonly descripcion: string;
  readonly libroOrigen: LibroOrigen;
  readonly estado: EstadoObservacion;
  readonly id?: number;
  readonly ejecucionId?: number;
  readonly transaccionId?: number;
  readonly transaccionIngresoEgresoId?: number;
  readonly valorInformado?: number;
  readonly valorCalculado?: number;
  readonly diferencia?: number;
  readonly motivoDescarte?: string;
  readonly revisadaPorId?: number;
  readonly revisadaEn?: Date;

  constructor(datos: DatosObservacion) {
    this.cuentaMensualId = datos.cuentaMensualId;
    this.codigoRegla = datos.codigoRegla;
    this.tipo = datos.tipo;
    this.descripcion = datos.descripcion;
    this.libroOrigen = datos.libroOrigen;
    this.estado = datos.estado;
    this.id = datos.id;
    this.ejecucionId = datos.ejecucionId;
    this.transaccionId = datos.transaccionId;
    this.transaccionIngresoEgresoId = datos.transaccionIngresoEgresoId;
    this.valorInformado = datos.valorInformado;
    this.valorCalculado = datos.valorCalculado;
    this.diferencia = datos.diferencia;
    this.motivoDescarte = datos.motivoDescarte;
    this.revisadaPorId = datos.revisadaPorId;
    this.revisadaEn = datos.revisadaEn;
  }
}
