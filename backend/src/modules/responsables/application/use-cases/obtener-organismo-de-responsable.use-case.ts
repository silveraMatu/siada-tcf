import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import type { Organismo } from '../../../organismos/domain/entities/organismo.domain.js';

//el organismo al que esta vinculado el responsable de un usuario (un responsable tiene como maximo uno)
@Injectable()
export class ObtenerOrganismoDeResponsableUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
    private readonly organismoRepository: OrganismoRepositoryPort,
  ) {}

  async execute(usuarioId: number): Promise<Organismo> {
    const responsable =
      await this.responsableRepository.buscarPorUsuarioId(usuarioId);
    if (!responsable) {
      throw new NotFoundException(
        `El Usuario con ID ${usuarioId} no tiene un Responsable asociado.`,
      );
    }
    if (!responsable.active) {
      throw new ConflictException(
        `El Responsable del Usuario con ID ${usuarioId} está inactivo.`,
      );
    }
    if (responsable.organismoId === null) {
      throw new ConflictException(
        `El Responsable del Usuario con ID ${usuarioId} todavía no tiene un organismo asignado.`,
      );
    }

    const organismo = await this.organismoRepository.buscarPorId(
      responsable.organismoId,
    );
    if (!organismo) {
      throw new NotFoundException(
        `El Organismo con ID ${responsable.organismoId} no existe.`,
      );
    }
    if (!organismo.active) {
      throw new ConflictException(
        `El Organismo con ID ${responsable.organismoId} no está activo.`,
      );
    }
    return organismo;
  }
}
