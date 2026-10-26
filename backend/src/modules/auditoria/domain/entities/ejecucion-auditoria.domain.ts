import type { EstadoValidacion } from '../types/auditoria.types.js';
import type { validationsCode } from '../rules/validations.js';
import type { NombreLibro } from '../types/auditoria.types.js';

//lo que quedó guardado de cada regla en una ejecución; las observaciones se leen aparte
export interface ResumenResultado {
  codigoRegla: validationsCode;
  estado: EstadoValidacion;
  mensaje?: string;
  filasEvaluadas: number | null;
  librosFaltantes: NombreLibro[];
}

//una corrida del motor sobre los documentos de una rendición, con la versión de reglas que se usó
export interface DatosEjecucionAuditoria {
  cuentaMensualId: number;
  versionReglas: string;
  ejecutadaPorId: number;
  resultados: ResumenResultado[];
  id?: number;
  ejecutadaEn?: Date;
  //al cerrar la auditoría
  cerradaEn?: Date | null;
  cerradaPorId?: number | null;
  conclusion?: string | null;
  estadoFinal?: string | null;
}

export class EjecucionAuditoria implements DatosEjecucionAuditoria {
  readonly cuentaMensualId: number;
  readonly versionReglas: string;
  readonly ejecutadaPorId: number;
  readonly resultados: ResumenResultado[];
  readonly id?: number;
  readonly ejecutadaEn?: Date;
  readonly cerradaEn: Date | null;
  readonly cerradaPorId: number | null;
  readonly conclusion: string | null;
  readonly estadoFinal: string | null;

  constructor(datos: DatosEjecucionAuditoria) {
    this.cuentaMensualId = datos.cuentaMensualId;
    this.versionReglas = datos.versionReglas;
    this.ejecutadaPorId = datos.ejecutadaPorId;
    this.resultados = datos.resultados;
    this.id = datos.id;
    this.ejecutadaEn = datos.ejecutadaEn;
    this.cerradaEn = datos.cerradaEn ?? null;
    this.cerradaPorId = datos.cerradaPorId ?? null;
    this.conclusion = datos.conclusion ?? null;
    this.estadoFinal = datos.estadoFinal ?? null;
  }

  estaCerrada(): boolean {
    return this.cerradaEn !== null;
  }
}
