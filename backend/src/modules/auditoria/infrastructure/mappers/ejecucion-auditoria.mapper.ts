import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import { EjecucionAuditoriaEntity } from '../entities/ejecucion-auditoria.entity.js';

export class EjecucionAuditoriaMapper {
  static toDomain(
    entity: EjecucionAuditoriaEntity,
    personas: ReadonlyMap<number, ResumenPersona> = new Map(),
  ): EjecucionAuditoria {
    return new EjecucionAuditoria({
      id: entity.id,
      cuentaMensualId: entity.cuentaMensualId,
      versionReglas: entity.versionReglas,
      ejecutadaPorId: entity.ejecutadaPorId,
      ejecutadaEn: entity.ejecutadaEn,
      resultados: entity.resultados,
      cerradaEn: entity.cerradaEn,
      cerradaPorId: entity.cerradaPorId,
      conclusion: entity.conclusion,
      estadoFinal: entity.estadoFinal,
      ejecutadaPor: personas.get(entity.ejecutadaPorId) ?? null,
      cerradaPor: personas.get(entity.cerradaPorId ?? -1) ?? null,
    });
  }
}
