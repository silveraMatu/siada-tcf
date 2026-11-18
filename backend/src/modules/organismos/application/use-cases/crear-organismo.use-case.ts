import { Injectable } from '@nestjs/common';
import { OrganismoRepositoryPort } from '../ports/out/organismo-repository.port.js';
import type { Rubro } from '../../domain/enums/rubro.enum.js';
import { Organismo } from '../../domain/entities/organismo.domain.js';

@Injectable()
export class CrearOrganismoUseCase {
  constructor(private readonly organismoRepository: OrganismoRepositoryPort) {}

  //el estado inicial (active) lo define el dominio; el cliente no lo elige
  async execute(nombre: string, rubro: Rubro): Promise<Organismo> {
    return await this.organismoRepository.crear(new Organismo(nombre, rubro));
  }
}
