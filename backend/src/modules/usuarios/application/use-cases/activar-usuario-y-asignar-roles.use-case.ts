import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsuarioRepositoryPort } from '../ports/out/usuario-repository.port.js';
import type { UsuarioSinPassword } from '../../domain/entities/usuario.domain.js';
import type { Rol } from '../../domain/enums/rol.enum.js';

@Injectable()
export class ActivarUsuarioYAsignarRolesUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepositoryPort) {}

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

    return await this.usuarioRepository.actualizar(id, { active, roles });
  }
}
