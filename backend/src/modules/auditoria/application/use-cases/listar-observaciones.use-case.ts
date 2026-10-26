import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../../../cuentas/application/services/acceso-cuenta.service.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { EjecucionAuditoriaRepositoryPort } from '../ports/out/ejecucion-auditoria-repository.port.js';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';

//las observaciones de la última ejecución de la rendición; vacío si todavía no se auditó
@Injectable()
export class ListarObservacionesUseCase {
  constructor(
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly ejecucionRepository: EjecucionAuditoriaRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  async execute(
    cuentaMensualId: number,
    actor: ActorAcceso,
  ): Promise<Observaciones[]> {
    if (!(await this.cuentaMensualRepository.existe(cuentaMensualId))) {
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

    const ejecucion =
      await this.ejecucionRepository.buscarUltima(cuentaMensualId);
    if (!ejecucion) return [];
    return await this.observacionRepository.obtenerPorEjecucion(ejecucion.id!);
  }
}
