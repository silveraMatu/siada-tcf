import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';

@Injectable()
export class AsignarOrganismoAResponsableUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
    private readonly organismoRepository: OrganismoRepositoryPort,
  ) {}

  //las validaciones son secuenciales: primero el responsable y luego el organismo
  async execute(responsableId: number, organismoId: number): Promise<Responsable> {
    const responsable = await this.responsableRepository.buscarPorId(responsableId);
    if (!responsable) {
      throw new NotFoundException(`El Responsable con ID ${responsableId} no existe.`);
    }
    if (!responsable.active) {
      throw new ConflictException(`El Responsable con ID ${responsableId} está inactivo.`);
    }

    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(`El Organismo con ID ${organismoId} no existe.`);
    }
    if (!organismo.active) {
      throw new ConflictException(`El Organismo con ID ${organismoId} no está activo.`);
    }

    return await this.responsableRepository.actualizar(responsableId, { organismoId });
  }
}
