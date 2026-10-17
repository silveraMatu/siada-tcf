import { Injectable, NotFoundException } from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';

@Injectable()
export class ObtenerResponsablesPorOrganismoUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
    private readonly organismoRepository: OrganismoRepositoryPort,
  ) {}

  async execute(organismoId: number): Promise<Responsable[]> {
    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(`El Organismo con ID ${organismoId} no existe.`);
    }

    return await this.responsableRepository.buscarPorOrganismo(organismoId);
  }
}
