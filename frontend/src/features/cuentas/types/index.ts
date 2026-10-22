export type EstadoCuentaMensual =
  | 'EN_BORRADOR'
  | 'LISTO_PARA_AUDITAR'
  | 'EN_AUDITORIA'
  | 'CON_OBSERVACIONES'
  | 'AUDITADA';

export interface CuentaMensual {
  id: number;
  mes: number;
  cuentaAnualId: number;
  /** Puede llegar un estado nuevo del backend que aún no conocemos. */
  estado: EstadoCuentaMensual | (string & {});
  fechaCreacion: string;
}

/** Tipos de libro contable que puede traer una rendición; hoy solo existe el libro banco. */
export type TipoLibro = 'LIBRO_BANCO';

/** Qué trae un libro cargado en una rendición, sin sus transacciones. */
export interface ResumenLibro {
  id: number;
  /** Puede llegar un tipo nuevo del backend que aún no conocemos. */
  tipo: TipoLibro | (string & {});
  /** Solo el libro banco tiene N° de cuenta corriente; null en libros anteriores a que fuera obligatorio. */
  numeroCuentaCte: string | null;
  cantidadTransacciones: number;
  /** Primera y última fecha de sus transacciones (YYYY-MM-DD); null si ninguna trae fecha. */
  fechaDesde: string | null;
  fechaHasta: string | null;
}

/**
 * Ítem de `GET /cuentas-mensuales`: la cuenta con el organismo y el ejercicio a los que pertenece
 * y el resumen de sus libros.
 */
export interface CuentaMensualListada extends CuentaMensual {
  organismoId: number;
  organismoNombre: string;
  ejercicioFiscal: number;
  libros: ResumenLibro[];
}

export interface ResolverCuentaMensualPayload {
  organismoId: number;
  ejercicioFiscal: number;
  mes: number;
}

/** Selección del usuario con la que se resolvió la cuenta (incluye el nombre para mostrarlo). */
export interface ContextoCuenta {
  organismoId: number;
  organismoNombre: string;
  ejercicioFiscal: number;
  mes: number;
}
