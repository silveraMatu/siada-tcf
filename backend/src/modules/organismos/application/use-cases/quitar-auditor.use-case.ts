import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { Organismo } from '../../domain/entities/organismo.domain.js';
import { OrganismoRepositoryPort } from '../ports/out/organismo-repository.port.js';

@Injectable()
export class QuitarAuditorUseCase {
  constructor(
    private readonly organismoRepository: OrganismoRepositoryPort,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(organismoId: number): Promise<Organismo> {
    this.actividad.organismo(organismoId);

    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(
        `El Organismo con ID ${organismoId} no existe.`,
      );
    }
    if (organismo.auditorId === null) {
      throw new ConflictException(
        `El Organismo con ID ${organismoId} no tiene un auditor asignado.`,
      );
    }

    this.actividad.detalle({
      auditorAnteriorId: organismo.auditorId,
      auditorNuevoId: null,
    });
    await this.organismoRepository.asignarAuditor(organismoId, null);

    return (await this.organismoRepository.buscarPorId(organismoId))!;
  }
}
