import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualEntity } from '../entities/cuenta-mensual.entity.js';

export class CuentaMensualMapper {
  static toDomain(
    entity: CuentaMensualEntity,
    presentadaPor: ResumenPersona | null = null,
  ): CuentaMensual {
    return new CuentaMensual(
      entity.mes,
      entity.cuentaAnualId,
      entity.estado,
      entity.id,
      entity.fechaCreacion,
      entity.presentadaPorId,
      entity.presentadaEn,
      presentadaPor,
    );
  }

  static toEntity(domain: CuentaMensual): CuentaMensualEntity {
    const entity = new CuentaMensualEntity();
    if (domain.id) entity.id = domain.id;
    entity.cuentaAnualId = domain.cuentaAnualId;
    entity.mes = domain.mes;
    entity.estado = domain.estado;
    return entity;
  }
}
