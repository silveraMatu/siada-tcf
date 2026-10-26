import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsuarioRepositoryPort } from '../ports/out/usuario-repository.port.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import type { UsuarioSinPassword } from '../../domain/entities/usuario.domain.js';
import type { Rol } from '../../domain/enums/rol.enum.js';

@Injectable()
export class ActivarUsuarioYAsignarRolesUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepositoryPort,
    private readonly actividad: ContextoActividadPort,
  ) {}

  //los roles nuevos reemplazan completamente los roles actuales del usuario o los asignan si no tiene ninguno
  async execute(
    id: number,
    active: boolean,
    roles: Rol[],
  ): Promise<UsuarioSinPassword> {
    if (active && roles.length === 0) {
      throw new BadRequestException(
        'Un usuario activo debe tener al menos un rol.',
      );
    }

    const usuario = await this.usuarioRepository.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException(`El Usuario con ID ${id} no existe.`);
    }

    this.actividad.detalle({
      active,
      rolesAnteriores: usuario.roles,
      rolesNuevos: roles,
    });
    return await this.usuarioRepository.actualizar(id, { active, roles });
  }
}
