import { EjecucionAuditoria } from '../../../domain/entities/ejecucion-auditoria.domain.js';
import { Observaciones } from '../../../domain/entities/observaciones.domain.js';

export interface EjecucionGuardada {
  ejecucion: EjecucionAuditoria;
  observaciones: Observaciones[];
  //false si ya existía una ejecución de esa rendición con esa versión de reglas (y no se guardó nada nuevo)
  creada: boolean;
}

export abstract class EjecucionAuditoriaRepositoryPort {
  //guarda la ejecución y sus observaciones en una sola transacción. Si la rendición ya tiene una con la misma
  //versión de reglas (incluso si otra petición se la ganó), devuelve esa y no guarda nada
  abstract guardar(
    ejecucion: EjecucionAuditoria,
    observaciones: Observaciones[],
  ): Promise<EjecucionGuardada>;

  //la más reciente de la rendición; null si nunca se auditó
  abstract buscarUltima(
    cuentaMensualId: number,
  ): Promise<EjecucionAuditoria | null>;

  //solo si todavía no estaba cerrada (atómico); false si no existe o ya se cerró
  abstract cerrar(
    ejecucionId: number,
    cierre: { cerradaPorId: number; conclusion: string; estadoFinal: string },
  ): Promise<boolean>;
}
