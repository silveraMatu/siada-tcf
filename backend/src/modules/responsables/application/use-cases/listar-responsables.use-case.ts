import { Injectable } from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';

@Injectable()
export class ListarResponsablesUseCase {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
  ) {}

  async execute(filtros?: { sinOrganismo?: boolean }): Promise<Responsable[]> {
    return await this.responsableRepository.listar(filtros);
  }
}
