/** Resultado de una regla del motor determinístico (lo que devuelve `POST .../libro-banco/ejecutar`). */
export type EstadoValidacion = 'VERIFICADO' | 'FALLO' | 'FALTAN_LIBROS';

/** Observación persistida por el motor cuando una regla falla. */
export interface ObservacionApi {
  id: number;
  cuentaMensualId: number;
  codigoRegla: string;
  tipo: string;
  descripcion: string;
  libroOrigen: string;
  estado: string;
  /** Fila (transacción) donde se detectó; null si el hallazgo es de toda la cuenta. */
  transaccionId: number | null;
}

export interface ResultadoValidacion {
  codigoRegla: string;
  /** Nombre legible de la regla, por ejemplo «Saldo de cuenta». */
  descripcion: string;
  estado: EstadoValidacion;
  /** Solo en FALTAN_LIBROS: «Faltan libros requeridos: LIBRO_BANCO, RACI». */
  mensaje?: string;
  observaciones: ObservacionApi[];
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
  transaccionId: number | null;
  libroId?: number;
  libroNombre?: string;
  /** Posición de la fila en el libro (base 1), igual que la numeración de la tabla. */
  fila?: number;
}

/** Los tres contadores que acompañan a cada regla. `null` = no se puede calcular. */
export interface ContadoresRegla {
  /** Filas con observación. */
  falladas: number;
  /** Filas evaluadas sin diferencias. */
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
