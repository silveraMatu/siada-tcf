import { Responsable } from '../../domain/entities/responsable.domain.js';
import { ResponsableEntity } from '../entities/responsable.entity.js';

export class ResponsableMapper {
  static toDomain(entity: ResponsableEntity): Responsable {
    return new Responsable(
      entity.usuarioId,
      entity.organismoId,
      entity.active,
      entity.id,
      entity.fechaCreacion,
    );
  }

  static toEntity(domain: Responsable): ResponsableEntity {
    const entity = new ResponsableEntity();
    if (domain.id) entity.id = domain.id;
    entity.usuarioId = domain.usuarioId;
    entity.organismoId = domain.organismoId;
    entity.active = domain.active;
    return entity;
  }
}
