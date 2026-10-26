import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../../../cuentas/application/services/acceso-cuenta.service.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';

@Injectable()
export class ListarObservacionesUseCase {
  constructor(
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  async execute(
    cuentaMensualId: number,
    actor: ActorAcceso,
  ): Promise<Observaciones[]> {
    const existeCuenta =
      await this.cuentaMensualRepository.existe(cuentaMensualId);
    if (!existeCuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    if (!(await this.accesoCuenta.puedeLeer(actor, organismoId))) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece a un organismo al que tenga acceso.',
      );
    }

    return await this.observacionRepository.obtenerPorCuentaMensual(
      cuentaMensualId,
    );
  }
}
