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
import type { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import type { ResultadoValidacion } from '../../domain/types/auditoria.types.js';
import { EjecucionAuditoriaRepositoryPort } from '../ports/out/ejecucion-auditoria-repository.port.js';
import {
  ObservacionRepositoryPort,
  type ConteoObservaciones,
} from '../ports/out/observacion-repository.port.js';
import { componerResultados } from '../services/resultados-ejecucion.js';

export interface EjecucionDetallada {
  ejecucion: EjecucionAuditoria;
  resultados: ResultadoValidacion[];
  conteo: ConteoObservaciones;
}

//la última ejecución de la rendición con los resultados de cada regla y cuántas observaciones hay en cada estado
@Injectable()
export class ObtenerEjecucionUseCase {
  constructor(
    private readonly ejecucionRepository: EjecucionAuditoriaRepositoryPort,
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  async execute(
    cuentaMensualId: number,
    actor: ActorAcceso,
  ): Promise<EjecucionDetallada> {
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
    if (!ejecucion) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} todavía no tiene una auditoría ejecutada.`,
      );
    }

    const [observaciones, conteo] = await Promise.all([
      this.observacionRepository.obtenerPorEjecucion(ejecucion.id!),
      this.observacionRepository.contarPorEstado(ejecucion.id!),
    ]);
    return {
      ejecucion,
      resultados: componerResultados(ejecucion.resultados, observaciones),
      conteo,
    };
  }
}
