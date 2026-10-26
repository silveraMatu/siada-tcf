import { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import { EjecucionAuditoriaEntity } from '../entities/ejecucion-auditoria.entity.js';

export class EjecucionAuditoriaMapper {
  static toDomain(entity: EjecucionAuditoriaEntity): EjecucionAuditoria {
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
    });
  }
}
