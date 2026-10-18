import type { UsuarioSinPassword } from '../../domain/entities/usuario.domain.js';
import type { UsuarioResponseDto } from './dto/usuario-response.dto.js';

export function toUsuarioResponse(
  usuario: UsuarioSinPassword,
): UsuarioResponseDto {
  return {
    id: usuario.id!,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    dni: usuario.dni,
    email: usuario.email,
    active: usuario.active,
    roles: usuario.roles,
    fechaCreacion: usuario.fechaCreacion!.toISOString(),
  };
}
