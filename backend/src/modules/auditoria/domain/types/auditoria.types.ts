import type { Observaciones } from '../entities/observaciones.domain.js';
import type { validationsCode } from '../rules/validations.js';

//libros que una regla puede necesitar para correr
export type NombreLibro = 'LIBRO_BANCO' | 'INGRESOS_EGRESOS' | 'RACI' | 'RAI';

export enum EstadoValidacion {
  VERIFICADO = 'VERIFICADO', //la regla corrió y no encontró nada
  FALLO = 'FALLO', //la regla corrió y encontró hallazgos
  FALTAN_LIBROS = 'FALTAN_LIBROS', //la regla no pudo correr: falta algún libro requerido
}

export interface ResultadoValidacion {
  codigoRegla: validationsCode;
  estado: EstadoValidacion;
  mensaje?: string; //ej: "Faltan libros requeridos: RACI"
  observaciones: Observaciones[]; //vacío si el estado es VERIFICADO o FALTAN_LIBROS
}
