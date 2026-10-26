import type { EntityManager } from 'typeorm';
import { cargarResumenesPersona } from '../../../../common/resumen-persona.js';
import type { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import type { EjecucionAuditoriaEntity } from '../entities/ejecucion-auditoria.entity.js';
import type { ObservacionEntity } from '../entities/observaciones.entity.js';
import { EjecucionAuditoriaMapper } from './ejecucion-auditoria.mapper.js';
import { ObservacionMapper } from './observacion.mapper.js';

//pasan a dominio sumando el nombre de las personas que intervinieron, con una sola consulta para todas

export async function observacionesADominio(
  manager: EntityManager,
  entities: ObservacionEntity[],
): Promise<Observaciones[]> {
  const personas = await cargarResumenesPersona(
    manager,
    entities.map((e) => e.revisadaPorId),
  );
  return entities.map((e) =>
    ObservacionMapper.toDomain(e, personas.get(e.revisadaPorId ?? -1) ?? null),
  );
}

export async function ejecucionesADominio(
  manager: EntityManager,
  entities: EjecucionAuditoriaEntity[],
): Promise<EjecucionAuditoria[]> {
  const personas = await cargarResumenesPersona(
    manager,
    entities.flatMap((e) => [e.ejecutadaPorId, e.cerradaPorId]),
  );
  return entities.map((e) => EjecucionAuditoriaMapper.toDomain(e, personas));
}
