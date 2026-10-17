export type EstadoCuentaMensual =
  | 'pendiente_carga'
  | 'cargada'
  | 'lista_para_auditar'
  | 'con_observaciones'
  | 'auditada'
  | 'rechazada'
  | 'cerrada';

export interface CuentaMensual {
  id: number;
  mes: number;
  cuentaAnualId: number;
  /** Puede llegar un estado nuevo del backend que aún no conocemos. */
  estado: EstadoCuentaMensual | (string & {});
  fechaCreacion: string;
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
