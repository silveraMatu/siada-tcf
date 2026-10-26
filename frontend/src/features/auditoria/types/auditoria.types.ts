/** Resultado de una regla del motor determinístico (lo que devuelve `POST .../libro-banco/ejecutar`). */
export type EstadoValidacion = 'VERIFICADO' | 'FALLO' | 'FALTAN_LIBROS';

/** Cómo va la revisión del auditor sobre un hallazgo. */
export type EstadoObservacion = 'ABIERTA' | 'CONFIRMADA' | 'DESCARTADA';

/** Observación persistida por el motor cuando una regla falla. */
export interface ObservacionApi {
  id: number;
  cuentaMensualId: number;
  /** Ejecución de la que sale; solo se puede revisar la de la última. */
  ejecucionId: number;
  codigoRegla: string;
  tipo: string;
  descripcion: string;
  libroOrigen: string;
  estado: EstadoObservacion;
  /** Transacción del libro banco donde se detectó (solo V3); null si no es de ese libro. */
  transaccionId: number | null;
  /** Transacción del libro de Ingresos y Egresos donde se detectó (V1 y V2); null en los cruces, que son de toda la cuenta. */
  transaccionIngresoEgresoId: number | null;
  /** Lo que dice el libro auditado, lo esperado y la diferencia absoluta; null si el hallazgo no es de un importe. */
  valorInformado: number | null;
  valorCalculado: number | null;
  diferencia: number | null;
  /** Obligatorio al descartar; null en cualquier otro estado. */
  motivoDescarte: string | null;
  revisadaPorId: number | null;
  /** ISO; null mientras está abierta. */
  revisadaEn: string | null;
}

export interface ResultadoValidacion {
  codigoRegla: string;
  /** Nombre legible de la regla, por ejemplo «Saldo de cuenta». */
  descripcion: string;
  estado: EstadoValidacion;
  /** Solo en FALTAN_LIBROS: «Faltan libros requeridos: LIBRO_BANCO, RACI». */
  mensaje?: string;
  observaciones: ObservacionApi[];
  /** Controles que hizo la regla (filas validadas, o 1 si compara un total contra otro); null si no corrió. */
  filasEvaluadas: number | null;
  /** Códigos de los libros que le faltan para correr, por ejemplo `INGRESOS_EGRESOS`; vacío si corrió. */
  librosFaltantes: string[];
}

/** Cuántas observaciones de una ejecución hay en cada estado. */
export interface ConteoObservaciones {
  abiertas: number;
  confirmadas: number;
  descartadas: number;
}

/** Estado con el que queda la rendición al cerrar la auditoría. */
export type EstadoFinalAuditoria = 'AUDITADA' | 'CON_OBSERVACIONES';

/** `GET …/ejecucion`: la última ejecución de la auditoría tal como la guarda el servidor. */
export interface Ejecucion {
  id: number;
  cuentaMensualId: number;
  /** Versión del conjunto de reglas que corrió. */
  versionReglas: string;
  ejecutadaPorId: number;
  /** ISO */
  ejecutadaEn: string;
  /** ISO; null mientras la auditoría está en curso. */
  cerradaEn: string | null;
  cerradaPorId: number | null;
  conclusion: string | null;
  estadoFinal: EstadoFinalAuditoria | null;
  resultados: ResultadoValidacion[];
  observaciones: ConteoObservaciones;
}

/** Resultado de una ejecución, con la hora en que se pidió. */
export interface EjecucionValidaciones {
  resultados: ResultadoValidacion[];
  /** Milisegundos desde epoch. */
  ejecutadoEn: number;
}

/** Observación con el libro y la fila que la originaron, para mostrarla y llevar al auditor hasta ella. */
export interface ObservacionUbicada {
  id: number;
  mensaje: string;
  /** Id de la transacción hallada dentro de su libro (banco o Ingresos y Egresos); null si es de toda la cuenta. */
  transaccionId: number | null;
  libroTipo?: string;
  libroId?: number;
  libroNombre?: string;
  /** Número de fila tal como lo muestra la tabla del libro: la posición en el libro banco, la fila del archivo en Ingresos y Egresos. */
  fila?: number;
}

/** Los tres contadores que acompañan a cada regla. `null` = no se puede calcular. */
export interface ContadoresRegla {
  /** Controles con observación. */
  falladas: number;
  /** Controles sin diferencias. */
  verificadas: number | null;
  /** Libros requeridos que faltan para correr la regla. */
  librosFaltantes: number;
}

export interface ResumenResultados {
  verificadas: number;
  fallidas: number;
  omitidas: number;
  /** Total de observaciones de todas las reglas fallidas. */
  observaciones: number;
}
