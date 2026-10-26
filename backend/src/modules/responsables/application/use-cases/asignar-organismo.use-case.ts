import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';

@Injectable()
export class AsignarOrganismoAResponsableUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
    private readonly organismoRepository: OrganismoRepositoryPort,
    private readonly usuarioRepository: UsuarioRepositoryPort,
    private readonly actividad: ContextoActividadPort,
  ) {}

  //las validaciones son secuenciales: primero el responsable (y su usuario) y luego el organismo
  async execute(
    responsableId: number,
    organismoId: number,
  ): Promise<Responsable> {
    this.actividad.organismo(organismoId);
    const responsable =
      await this.responsableRepository.buscarPorId(responsableId);
    if (!responsable) {
      throw new NotFoundException(
        `El Responsable con ID ${responsableId} no existe.`,
      );
    }
    if (!responsable.active) {
      throw new ConflictException(
        `El Responsable con ID ${responsableId} está inactivo.`,
      );
    }

    //el usuario pudo desactivarse o perder el rol despues de crear el responsable
    const usuario = await this.usuarioRepository.buscarPorId(
      responsable.usuarioId,
    );
    if (
      !usuario ||
      !usuario.active ||
      !usuario.roles.includes(Rol.RESPONSABLE)
    ) {
      throw new ConflictException(
        `El Usuario del Responsable con ID ${responsableId} no está activo o ya no tiene el rol RESPONSABLE.`,
      );
    }

    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(
        `El Organismo con ID ${organismoId} no existe.`,
      );
    }
    if (!organismo.active) {
      throw new ConflictException(
        `El Organismo con ID ${organismoId} no está activo.`,
      );
    }

    return await this.responsableRepository.actualizar(responsableId, {
      organismoId,
    });
  }
}
