import { Responsable } from '../../domain/entities/responsable.domain.js';
import { ResponsableEntity } from '../entities/responsable.entity.js';

export class ResponsableMapper {
  static toDomain(entity: ResponsableEntity): Responsable {
    return new Responsable(
      entity.nombre,
      entity.apellido,
      entity.email,
      entity.organismoId,
      entity.activo,
      entity.id,
      entity.fechaCreacion,
    );
  }

  static toEntity(domain: Responsable): ResponsableEntity {
    const entity = new ResponsableEntity();
    if (domain.id) entity.id = domain.id;
    entity.nombre = domain.nombre;
    entity.apellido = domain.apellido;
    entity.email = domain.email;
    entity.organismoId = domain.organismoId;
    entity.activo = domain.activo;
    return entity;
  }
}
