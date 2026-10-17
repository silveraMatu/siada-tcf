import { Injectable } from '@nestjs/common';
import { Organismo } from '../../domain/entities/organismo.domain.js';
import { OrganismoRepositoryPort } from '../ports/out/organismo-repository.port.js';

@Injectable()
export class ListarOrganismosUseCase {
  constructor(private readonly organismoRepository: OrganismoRepositoryPort) {}

  async execute(): Promise<Organismo[]> {
    return await this.organismoRepository.buscarTodos();
  }
}
