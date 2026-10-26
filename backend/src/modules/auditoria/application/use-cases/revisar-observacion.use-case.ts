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
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { EstadoObservacion } from '../../domain/rules/validations.js';
import { EjecucionAuditoriaRepositoryPort } from '../ports/out/ejecucion-auditoria-repository.port.js';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';

export type DecisionRevision = 'CONFIRMAR' | 'DESCARTAR' | 'REABRIR';

export interface RevisarObservacionComando {
  decision: DecisionRevision;
  //obligatorio al descartar
  motivo?: string;
}

//el auditor decide qué hacer con cada hallazgo del motor: lo confirma, lo descarta (con motivo) o lo vuelve a abrir.
//Solo mientras la auditoría está en curso y sobre la última ejecución
@Injectable()
export class RevisarObservacionUseCase {
  constructor(
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly ejecucionRepository: EjecucionAuditoriaRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    observacionId: number,
    comando: RevisarObservacionComando,
    actor: ActorAcceso,
  ): Promise<Observaciones> {
    const observacion =
      await this.observacionRepository.buscarPorId(observacionId);
    if (!observacion) {
      throw new NotFoundException(
        `La Observación con ID ${observacionId} no existe.`,
      );
    }
    const cuentaMensualId = observacion.cuentaMensualId;
    this.actividad.cuentaMensual(cuentaMensualId);

    //primero el permiso: un 409 distinto le revelaría el estado de la rendición a quien no puede verla
    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    if (organismoId !== null) this.actividad.organismo(organismoId);
    if (!(await this.accesoCuenta.puedeLeer(actor, organismoId))) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece a un organismo al que tenga acceso.',
      );
    }

    const cuenta =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    if (cuenta?.estado !== EstadoCuentaMensual.EN_AUDITORIA) {
      throw new ConflictException(
        cuenta?.estado === EstadoCuentaMensual.AUDITADA ||
          cuenta?.estado === EstadoCuentaMensual.CON_OBSERVACIONES
          ? 'La auditoría de esta rendición ya fue cerrada.'
          : 'La auditoría de esta rendición no está en curso.',
      );
    }

    //las de una ejecución anterior (otra versión de reglas) quedan como historial: no se revisan
    const ultima = await this.ejecucionRepository.buscarUltima(cuentaMensualId);
    if (ultima?.id !== observacion.ejecucionId) {
      throw new ConflictException(
        'La observación pertenece a una ejecución anterior: revisá la más reciente.',
      );
    }

    const ahora = new Date();
    let cambios;
    if (comando.decision === 'CONFIRMAR') {
      cambios = {
        estado: EstadoObservacion.CONFIRMADA,
        motivoDescarte: null,
        revisadaPorId: actor.usuarioId,
        revisadaEn: ahora,
      };
    } else if (comando.decision === 'DESCARTAR') {
      const motivo = comando.motivo?.trim();
      if (!motivo) {
        throw new BadRequestException(
          'Para descartar una observación hay que indicar el motivo.',
        );
      }
      cambios = {
        estado: EstadoObservacion.DESCARTADA,
        motivoDescarte: motivo,
        revisadaPorId: actor.usuarioId,
        revisadaEn: ahora,
      };
    } else {
      cambios = {
        estado: EstadoObservacion.ABIERTA,
        motivoDescarte: null,
        revisadaPorId: null,
        revisadaEn: null,
      };
    }

    this.actividad.detalle({
      decision: comando.decision,
      estadoAnterior: observacion.estado,
      estadoNuevo: cambios.estado,
      codigoRegla: observacion.codigoRegla,
      ...(cambios.motivoDescarte && { motivo: cambios.motivoDescarte }),
    });
    return await this.observacionRepository.revisar(observacionId, cambios);
  }
}
