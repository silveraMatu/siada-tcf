import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { EstadoCuentaMensual } from '../../../cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { EstadoObservacion } from '../../domain/rules/validations.js';
import { EjecucionAuditoriaRepositoryPort } from '../ports/out/ejecucion-auditoria-repository.port.js';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';

//el auditor cierra la auditoría cuando revisó todas las observaciones: queda AUDITADA si ninguna se confirmó
//y CON_OBSERVACIONES si hay al menos una confirmada. Con su conclusión escrita, que queda en la ejecución
@Injectable()
export class CerrarAuditoriaUseCase {
  constructor(
    private readonly ejecucionRepository: EjecucionAuditoriaRepositoryPort,
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    cuentaMensualId: number,
    conclusion: string,
    actor: ActorAcceso,
  ): Promise<EstadoCuentaMensual> {
    const cuenta =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    if (!cuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    if (organismoId !== null) this.actividad.organismo(organismoId);
    if (!(await this.accesoCuenta.puedeLeer(actor, organismoId))) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece a un organismo al que tenga acceso.',
      );
    }

    if (cuenta.estado !== EstadoCuentaMensual.EN_AUDITORIA) {
      throw new ConflictException(
        cuenta.estado === EstadoCuentaMensual.AUDITADA ||
          cuenta.estado === EstadoCuentaMensual.CON_OBSERVACIONES
          ? 'La auditoría de esta rendición ya fue cerrada.'
          : 'La auditoría de esta rendición no está en curso.',
      );
    }

    const texto = conclusion.trim();
    if (!texto) {
      throw new BadRequestException(
        'Para cerrar la auditoría hay que escribir la conclusión.',
      );
    }

    const ejecucion =
      await this.ejecucionRepository.buscarUltima(cuentaMensualId);
    if (!ejecucion) {
      throw new ConflictException(
        'La rendición no tiene una auditoría ejecutada que cerrar.',
      );
    }

    const conteo = await this.observacionRepository.contarPorEstado(
      ejecucion.id!,
    );
    const abiertas = conteo[EstadoObservacion.ABIERTA];
    if (abiertas > 0) {
      throw new ConflictException(
        abiertas === 1
          ? 'Queda 1 observación sin revisar: confirmala o descartala antes de cerrar.'
          : `Quedan ${abiertas} observaciones sin revisar: confirmalas o descartalas antes de cerrar.`,
      );
    }

    const estadoFinal =
      conteo[EstadoObservacion.CONFIRMADA] > 0
        ? EstadoCuentaMensual.CON_OBSERVACIONES
        : EstadoCuentaMensual.AUDITADA;

    //atómico: si otra petición la cerró entre la lectura y este cambio, no pisa nada
    const cambio = await this.cuentaMensualRepository.cambiarEstado(
      cuentaMensualId,
      EstadoCuentaMensual.EN_AUDITORIA,
      estadoFinal,
    );
    if (!cambio) {
      throw new ConflictException(
        'La auditoría de esta rendición ya fue cerrada.',
      );
    }
    await this.ejecucionRepository.cerrar(ejecucion.id!, {
      cerradaPorId: actor.usuarioId,
      conclusion: texto,
      estadoFinal,
    });

    this.actividad.detalle({
      ejecucionId: ejecucion.id,
      estadoFinal,
      confirmadas: conteo[EstadoObservacion.CONFIRMADA],
      descartadas: conteo[EstadoObservacion.DESCARTADA],
    });
    return estadoFinal;
  }
}
