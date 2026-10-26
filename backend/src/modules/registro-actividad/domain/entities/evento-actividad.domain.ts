import type { AccionActividad } from '../enums/accion-actividad.enum.js';
import type { ResultadoActividad } from '../enums/resultado-actividad.enum.js';

//quién hizo la acción, tal como era en ese momento (los datos del usuario pueden cambiar después)
export interface ActorActividad {
  usuarioId: number | null;
  nombre: string;
  apellido: string;
  dni: string;
  roles: string[];
}

export interface DatosEventoActividad {
  accion: AccionActividad;
  resultado: ResultadoActividad;
  codigoHttp: number;
  ocurridoEn: Date;
  actor: ActorActividad | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  entidadTipo: string | null;
  entidadId: number | null;
  organismoId: number | null;
  cuentaMensualId: number | null;
  detalle: Record<string, unknown> | null;
  id?: number;
}

//un hecho de la bitácora: inmutable una vez guardado
export class EventoActividad implements DatosEventoActividad {
  readonly accion: AccionActividad;
  readonly resultado: ResultadoActividad;
  readonly codigoHttp: number;
  readonly ocurridoEn: Date;
  readonly actor: ActorActividad | null;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly requestId: string | null;
  readonly entidadTipo: string | null;
  readonly entidadId: number | null;
  readonly organismoId: number | null;
  readonly cuentaMensualId: number | null;
  readonly detalle: Record<string, unknown> | null;
  readonly id?: number;

  constructor(datos: DatosEventoActividad) {
    this.accion = datos.accion;
    this.resultado = datos.resultado;
    this.codigoHttp = datos.codigoHttp;
    this.ocurridoEn = datos.ocurridoEn;
    this.actor = datos.actor;
    this.ip = datos.ip;
    this.userAgent = datos.userAgent;
    this.requestId = datos.requestId;
    this.entidadTipo = datos.entidadTipo;
    this.entidadId = datos.entidadId;
    this.organismoId = datos.organismoId;
    this.cuentaMensualId = datos.cuentaMensualId;
    this.detalle = datos.detalle;
    this.id = datos.id;
  }
}
