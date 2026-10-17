import { Usuario } from '../../domain/entities/usuario.domain.js';
import { UsuarioEntity } from '../entities/usuario.entity.js';

export class UsuarioMapper {
  static toDomain(entity: UsuarioEntity): Usuario {
    return new Usuario(
      entity.nombre,
      entity.apellido,
      entity.cuitDni,
      entity.email,
      entity.password,
      entity.active,
      entity.roles,
      entity.id,
      entity.fechaCreacion,
    );
  }

  static toEntity(domain: Usuario): UsuarioEntity {
    const entity = new UsuarioEntity();
    if (domain.id) entity.id = domain.id;
    entity.nombre = domain.nombre;
    entity.apellido = domain.apellido;
    entity.cuitDni = domain.cuitDni;
    entity.email = domain.email;
    entity.password = domain.password;
    entity.active = domain.active;
    entity.roles = domain.roles;
    return entity;
  }
}
