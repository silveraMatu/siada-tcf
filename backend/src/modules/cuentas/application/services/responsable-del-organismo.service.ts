import { Injectable } from '@nestjs/common';
import { ResponsableRepositoryPort } from '../../../responsables/application/ports/out/responsable-repository.port.js';

//¿el usuario es un responsable activo vinculado a ese organismo?
//cada caso de uso decide qué excepción y mensaje lanzar: acá solo se responde sí o no
@Injectable()
export class ResponsableDelOrganismoService {
  constructor(
    private readonly responsableRepository: ResponsableRepositoryPort,
  ) {}

  async esResponsableDelOrganismo(
    usuarioId: number,
    organismoId: number | null,
  ): Promise<boolean> {
    if (organismoId === null) return false;
    const responsable =
      await this.responsableRepository.buscarPorUsuarioId(usuarioId);
    return (
      responsable !== null &&
      responsable.active &&
      responsable.organismoId === organismoId
    );
  }
}
