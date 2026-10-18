import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';

@Injectable()
export class CrearResponsableUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
    private readonly usuarioRepository: UsuarioRepositoryPort,
  ) {}

  //requiere un usuario activo con rol RESPONSABLE; nace sin organismo
  async execute(usuarioId: number): Promise<Responsable> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NotFoundException(`El Usuario con ID ${usuarioId} no existe.`);
    }
    if (!usuario.active) {
      throw new ConflictException(
        `El Usuario con ID ${usuarioId} no está activo.`,
      );
    }
    if (!usuario.roles.includes(Rol.RESPONSABLE)) {
      throw new ConflictException(
        `El Usuario con ID ${usuarioId} no tiene el rol RESPONSABLE.`,
      );
    }

    if (await this.responsableRepository.buscarPorUsuarioId(usuarioId)) {
      throw new ConflictException(
        `El Usuario con ID ${usuarioId} ya tiene un Responsable asociado.`,
      );
    }

    return await this.responsableRepository.crear(new Responsable(usuarioId));
  }
}
