import { Injectable } from '@nestjs/common';
import { ResponsableRepositoryPort } from '../ports/out/responsable-repository.port.js';
import { Responsable } from '../../domain/entities/responsable.domain.js';

@Injectable()
export class CrearResponsableUseCase {
  constructor(private readonly responsableRepository: ResponsableRepositoryPort) {}

  //el responsable nace sin organismo (organismoId null) y activo; la asignacion a un organismo es un paso posterior
  async execute(nombre: string, apellido: string, email: string): Promise<Responsable> {
    return await this.responsableRepository.crear(new Responsable(nombre, apellido, email));
  }
}
