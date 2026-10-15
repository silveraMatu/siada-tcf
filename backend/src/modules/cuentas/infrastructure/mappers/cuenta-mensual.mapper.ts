import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualEntity } from '../entities/cuenta-mensual.entity.js';

export class CuentaMensualMapper {
  static toDomain(entity: CuentaMensualEntity): CuentaMensual {
    return new CuentaMensual(
      entity.id,
      entity.mes,
      entity.cuentaAnualId,
      entity.estado,
      entity.fechaCreacion,
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