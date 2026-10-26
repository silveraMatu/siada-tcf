import type { Observaciones } from '../entities/observaciones.domain.js';
import type { validationsCode } from '../rules/validations.js';

//libros que una regla puede necesitar para correr
export const NOMBRES_LIBRO = [
  'LIBRO_BANCO',
  'INGRESOS_EGRESOS',
  'RACI',
  'RAI',
] as const;
export type NombreLibro = (typeof NOMBRES_LIBRO)[number];

export enum EstadoValidacion {
  VERIFICADO = 'VERIFICADO', //la regla corrió y no encontró nada
  FALLO = 'FALLO', //la regla corrió y encontró hallazgos
  FALTAN_LIBROS = 'FALTAN_LIBROS', //la regla no pudo correr: falta algún libro requerido
}

//lo que devuelve una regla que sí corrió: VERIFICADO o FALLO
export interface ResultadoRegla {
  codigoRegla: validationsCode;
  estado: EstadoValidacion.VERIFICADO | EstadoValidacion.FALLO;
  observaciones: Observaciones[];
  //controles que hizo: filas validadas en las reglas fila a fila (la primera de cada libro es la base y no
  //cuenta) y 1 en los cruces, que comparan un total contra otro
  filasEvaluadas: number;
}

//lo que informa el motor por cada regla, corra o no
export interface ResultadoValidacion {
  codigoRegla: validationsCode;
  estado: EstadoValidacion;
  mensaje?: string; //ej: "Faltan libros requeridos: RACI"
  observaciones: Observaciones[]; //vacío si el estado es VERIFICADO o FALTAN_LIBROS
  filasEvaluadas: number | null; //null si la regla no corrió (FALTAN_LIBROS)
  librosFaltantes: NombreLibro[]; //vacío si la regla corrió
}
