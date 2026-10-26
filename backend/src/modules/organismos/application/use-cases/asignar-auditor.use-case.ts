import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { Organismo } from '../../domain/entities/organismo.domain.js';
import { OrganismoRepositoryPort } from '../ports/out/organismo-repository.port.js';

//el juez de trámite asigna el auditor que fiscaliza las rendiciones de un organismo (uno a la vez);
//asignar otro reemplaza al anterior, y el cambio queda en la bitácora
@Injectable()
export class AsignarAuditorUseCase {
  constructor(
    private readonly organismoRepository: OrganismoRepositoryPort,
    private readonly usuarioRepository: UsuarioRepositoryPort,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(organismoId: number, auditorId: number): Promise<Organismo> {
    this.actividad.organismo(organismoId);

    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(
        `El Organismo con ID ${organismoId} no existe.`,
      );
    }
    if (!organismo.active) {
      throw new ConflictException(
        `El Organismo con ID ${organismoId} está inactivo.`,
      );
    }

    const usuario = await this.usuarioRepository.buscarPorId(auditorId);
    if (!usuario) {
      throw new NotFoundException(`El Usuario con ID ${auditorId} no existe.`);
    }
    if (!usuario.active || !usuario.roles.includes(Rol.AUDITOR)) {
      throw new ConflictException(
        `El Usuario con ID ${auditorId} no está activo o no tiene el rol AUDITOR.`,
      );
    }

    this.actividad.detalle({
      auditorAnteriorId: organismo.auditorId,
      auditorNuevoId: auditorId,
    });
    await this.organismoRepository.asignarAuditor(organismoId, auditorId);

    return (await this.organismoRepository.buscarPorId(organismoId))!;
  }
}
