import type {
  AccionActividad,
  EntidadActividad,
  ResultadoActividad,
} from './types';

/** Etiqueta de cada acción, en el orden en que se ofrecen en el filtro. */
export const ACCIONES: Record<AccionActividad, string> = {
  USUARIO_REGISTRADO: 'Usuario registrado',
  LOGIN: 'Inicio de sesión',
  USUARIO_ACTIVADO: 'Usuario activado',
  ORGANISMO_CREADO: 'Organismo creado',
  RESPONSABLE_CREADO: 'Responsable creado',
  RESPONSABLE_ASIGNADO: 'Responsable asignado a un organismo',
  AUDITOR_ASIGNADO: 'Auditor asignado a un organismo',
  AUDITOR_QUITADO: 'Auditor quitado de un organismo',
  CUENTA_RESUELTA: 'Rendición abierta',
  LIBRO_BANCO_CARGADO: 'Libro Banco cargado',
  INGRESOS_EGRESOS_CARGADO: 'Ingresos y Egresos cargado',
  CUENTA_PRESENTADA: 'Rendición presentada',
  AUDITORIA_EJECUTADA: 'Auditoría ejecutada',
  OBSERVACION_REVISADA: 'Observación revisada',
  AUDITORIA_CERRADA: 'Auditoría cerrada',
  ACTIVIDAD_EXPORTADA: 'Bitácora exportada',
};

export const RESULTADOS: Record<ResultadoActividad, string> = {
  EXITO: 'Éxito',
  FALLO: 'Fallo',
  DENEGADO: 'Denegado',
};

export const ENTIDADES: Record<EntidadActividad, string> = {
  USUARIO: 'Usuario',
  ORGANISMO: 'Organismo',
  RESPONSABLE: 'Responsable',
  CUENTA_MENSUAL: 'Rendición',
  OBSERVACION: 'Observación',
};

/** «Rendición presentada» para una acción conocida; una nueva se muestra con su código. */
export function etiquetaDeAccion(accion: string): string {
  return ACCIONES[accion as AccionActividad] ?? accion;
}

export function etiquetaDeEntidad(tipo: string): string {
  return ENTIDADES[tipo as EntidadActividad] ?? tipo;
}
