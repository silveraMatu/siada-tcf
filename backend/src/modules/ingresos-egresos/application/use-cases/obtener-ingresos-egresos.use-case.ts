import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { IngresosEgresosRepositoryPort } from '../ports/out/ingresos-egresos-repository.port.js';

@Injectable()
export class ObtenerIngresosEgresosUseCase {
  constructor(
    private readonly ingresosEgresosRepository: IngresosEgresosRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
  ) {}

  //con 'soloResponsableDe' solo el responsable del organismo dueño de la cuenta puede leerla
  async execute(
    cuentaMensualId: number,
    soloResponsableDe?: { usuarioId: number },
  ): Promise<IngresosEgresos> {
    if (!(await this.cuentaMensualRepository.existe(cuentaMensualId))) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    if (soloResponsableDe) {
      const organismoId =
        await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
      if (
        !(await this.responsableDelOrganismo.esResponsableDelOrganismo(
          soloResponsableDe.usuarioId,
          organismoId,
        ))
      ) {
        throw new ForbiddenException(
          'La Cuenta Mensual no pertenece al organismo del responsable.',
        );
      }
    }

    const libro =
      await this.ingresosEgresosRepository.buscarPorCuentaMensualId(
        cuentaMensualId,
      );
    if (!libro) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no tiene un libro de ingresos y egresos cargado.`,
      );
    }
    return libro;
  }
}
