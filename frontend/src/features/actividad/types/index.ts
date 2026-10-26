export type AccionActividad =
  | 'USUARIO_REGISTRADO'
  | 'LOGIN'
  | 'USUARIO_ACTIVADO'
  | 'ORGANISMO_CREADO'
  | 'RESPONSABLE_CREADO'
  | 'RESPONSABLE_ASIGNADO'
  | 'AUDITOR_ASIGNADO'
  | 'AUDITOR_QUITADO'
  | 'CUENTA_RESUELTA'
  | 'LIBRO_BANCO_CARGADO'
  | 'INGRESOS_EGRESOS_CARGADO'
  | 'CUENTA_PRESENTADA'
  | 'AUDITORIA_EJECUTADA'
  | 'OBSERVACION_REVISADA'
  | 'AUDITORIA_CERRADA'
  | 'ACTIVIDAD_EXPORTADA';

export type ResultadoActividad = 'EXITO' | 'FALLO' | 'DENEGADO';

export type EntidadActividad =
  'USUARIO' | 'ORGANISMO' | 'RESPONSABLE' | 'CUENTA_MENSUAL' | 'OBSERVACION';

/** Un renglón de la bitácora tal como lo devuelve `GET /actividad`. */
export interface EventoActividad {
  id: number;
  /** ISO */
  ocurridoEn: string;
  /** Puede llegar una acción nueva que todavía no conocemos. */
  accion: AccionActividad | (string & {});
  resultado: ResultadoActividad;
  codigoHttp: number;
  /** null en un login fallido: nadie quedó identificado. */
  usuarioId: number | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  roles: string[];
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  entidadTipo: EntidadActividad | (string & {}) | null;
  entidadId: number | null;
  organismoId: number | null;
  cuentaMensualId: number | null;
  /** Datos propios de la acción; en un login fallido trae `email`. */
  detalle: Record<string, unknown> | null;
}

export interface PaginaActividad {
  eventos: EventoActividad[];
  /** Pasarlo como `cursor` para pedir la página siguiente; null si no hay más. */
  siguienteCursor: number | null;
}

/** Filtros de `GET /actividad` y de `GET /actividad/exportar`; todos opcionales. */
export interface FiltrosActividad {
  /** ISO con offset */
  desde?: string;
  hasta?: string;
  usuarioId?: number;
  dni?: string;
  accion?: AccionActividad;
  resultado?: ResultadoActividad;
  organismoId?: number;
  cuentaMensualId?: number;
  entidadTipo?: string;
  entidadId?: number;
}
