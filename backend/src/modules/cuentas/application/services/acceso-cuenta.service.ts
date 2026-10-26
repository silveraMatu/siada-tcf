import { Injectable } from '@nestjs/common';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { ResponsableDelOrganismoService } from './responsable-del-organismo.service.js';

//quién pide leer: el usuario autenticado y sus roles actuales
export interface ActorAcceso {
  usuarioId: number;
  roles: Rol[];
}

//¿puede este usuario ver las rendiciones de un organismo? Un solo lugar para esa regla:
//- ADMIN ve todas;
//- AUDITOR, solo las de los organismos que tiene asignados;
//- RESPONSABLE, solo las de su propio organismo.
//Un usuario con más de un rol alcanza con que alguno le dé acceso.
@Injectable()
export class AccesoCuentaService {
  constructor(
    private readonly organismoRepository: OrganismoRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
  ) {}

  async puedeLeer(
    actor: ActorAcceso,
    organismoId: number | null,
  ): Promise<boolean> {
    if (organismoId === null) return false;
    if (actor.roles.includes(Rol.ADMIN)) return true;

    if (
      actor.roles.includes(Rol.AUDITOR) &&
      (await this.organismoRepository.esAuditorDelOrganismo(
        actor.usuarioId,
        organismoId,
      ))
    ) {
      return true;
    }

    return (
      actor.roles.includes(Rol.RESPONSABLE) &&
      (await this.responsableDelOrganismo.esResponsableDelOrganismo(
        actor.usuarioId,
        organismoId,
      ))
    );
  }

  //ids de los organismos que puede ver en un listado; null = todos (ADMIN)
  async organismosVisibles(actor: ActorAcceso): Promise<number[] | null> {
    if (actor.roles.includes(Rol.ADMIN)) return null;
    return actor.roles.includes(Rol.AUDITOR)
      ? await this.organismoRepository.buscarIdsPorAuditor(actor.usuarioId)
      : [];
  }
}
