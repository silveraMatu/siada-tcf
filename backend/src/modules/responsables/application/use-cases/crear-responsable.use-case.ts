import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';

@Injectable()
export class CrearResponsableUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
    private readonly organismoRepository: OrganismoRepositoryPort,
  ) {}

  //el estado inicial (activo) lo define el dominio; el cliente no lo elige
  async execute(
    organismoId: number,
    nombre: string,
    apellido: string,
    email: string,
  ): Promise<Responsable> {
    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(`El Organismo con ID ${organismoId} no existe.`);
    }
    if (!organismo.active) {
      throw new ConflictException(`El Organismo con ID ${organismoId} no está activo.`);
    }

    return await this.responsableRepository.crear(
      new Responsable(nombre, apellido, email, organismoId),
    );
  }
}
