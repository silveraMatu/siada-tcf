import {
  Usuario,
  type UsuarioSinPassword,
} from '../../domain/entities/usuario.domain.js';
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

  //no lee entity.password: las consultas que lo usan ni siquiera lo traen de la base
  static toDomainSinPassword(entity: UsuarioEntity): UsuarioSinPassword {
    return {
      nombre: entity.nombre,
      apellido: entity.apellido,
      cuitDni: entity.cuitDni,
      email: entity.email,
      active: entity.active,
      roles: entity.roles,
      id: entity.id,
      fechaCreacion: entity.fechaCreacion,
    };
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
