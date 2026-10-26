import {
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
import { MotorAuditoriaService } from '../../domain/engine/motor-auditoria.service.js';
import { VERSION_REGLAS } from '../../domain/engine/version-reglas.js';
import { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import { EstadoValidacion } from '../../domain/types/auditoria.types.js';
import type { ResultadoValidacion } from '../../domain/types/auditoria.types.js';
import { DocumentosAuditablesPort } from '../ports/out/documentos-auditables.port.js';
import { EjecucionAuditoriaRepositoryPort } from '../ports/out/ejecucion-auditoria-repository.port.js';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';
import {
  aResumen,
  componerResultados,
} from '../services/resultados-ejecucion.js';

export interface EjecucionConResultados {
  ejecucion: EjecucionAuditoria;
  resultados: ResultadoValidacion[];
  //false si ya existía una ejecución con la versión de reglas vigente y se devolvió esa
  creada: boolean;
}

//el auditor corre el motor sobre los documentos presentados. Es idempotente: con las mismas reglas devuelve la
//ejecución que ya existe (conserva las revisiones del auditor); si cambió la versión de reglas, guarda una nueva
@Injectable()
export class EjecutarAuditoriaUseCase {
  constructor(
    private readonly motor: MotorAuditoriaService,
    private readonly ejecucionRepository: EjecucionAuditoriaRepositoryPort,
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly documentos: DocumentosAuditablesPort,
    private readonly accesoCuenta: AccesoCuentaService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    cuentaMensualId: number,
    actor: ActorAcceso,
  ): Promise<EjecucionConResultados> {
    const cuenta =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    if (!cuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    //primero el permiso: un 409 distinto le revelaría el estado de la cuenta a quien no puede verla
    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    if (organismoId !== null) this.actividad.organismo(organismoId);
    if (!(await this.accesoCuenta.puedeLeer(actor, organismoId))) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece a un organismo al que tenga acceso.',
      );
    }

    if (cuenta.estado === EstadoCuentaMensual.EN_BORRADOR) {
      throw new ConflictException(
        'La rendición todavía no fue presentada: no se puede auditar.',
      );
    }
    if (
      cuenta.estado === EstadoCuentaMensual.AUDITADA ||
      cuenta.estado === EstadoCuentaMensual.CON_OBSERVACIONES
    ) {
      throw new ConflictException(
        'La auditoría de esta rendición ya fue cerrada.',
      );
    }

    //con las mismas reglas no se vuelve a ejecutar: así no se pierden las revisiones del auditor
    const ultima = await this.ejecucionRepository.buscarUltima(cuentaMensualId);
    if (ultima?.versionReglas === VERSION_REGLAS) {
      return await this.devolver(ultima, false);
    }

    //el auditor toma la rendición: LISTO_PARA_AUDITAR → EN_AUDITORIA (si otro ya la tomó, no pasa nada)
    if (cuenta.estado === EstadoCuentaMensual.LISTO_PARA_AUDITAR) {
      await this.cuentaMensualRepository.cambiarEstado(
        cuentaMensualId,
        EstadoCuentaMensual.LISTO_PARA_AUDITAR,
        EstadoCuentaMensual.EN_AUDITORIA,
      );
    }

    const { librosBanco, ingresosEgresos } =
      await this.documentos.cargar(cuentaMensualId);
    const resultados = this.motor.ejecutarAuditoriaCompleta({
      cuentaMensualId,
      librosBanco,
      ingresosEgresos,
    });

    const guardada = await this.ejecucionRepository.guardar(
      new EjecucionAuditoria({
        cuentaMensualId,
        versionReglas: VERSION_REGLAS,
        ejecutadaPorId: actor.usuarioId,
        resultados: resultados.map(aResumen),
      }),
      resultados
        .filter((r) => r.estado === EstadoValidacion.FALLO)
        .flatMap((r) => r.observaciones),
    );

    this.actividad.detalle({
      ejecucionId: guardada.ejecucion.id,
      versionReglas: guardada.ejecucion.versionReglas,
      ejecucionNueva: guardada.creada,
      observaciones: guardada.observaciones.length,
    });
    return {
      ejecucion: guardada.ejecucion,
      resultados: componerResultados(
        guardada.ejecucion.resultados,
        guardada.observaciones,
      ),
      creada: guardada.creada,
    };
  }

  private async devolver(
    ejecucion: EjecucionAuditoria,
    creada: boolean,
  ): Promise<EjecucionConResultados> {
    const observaciones = await this.observacionRepository.obtenerPorEjecucion(
      ejecucion.id!,
    );
    this.actividad.detalle({
      ejecucionId: ejecucion.id,
      versionReglas: ejecucion.versionReglas,
      ejecucionNueva: creada,
      observaciones: observaciones.length,
    });
    return {
      ejecucion,
      resultados: componerResultados(ejecucion.resultados, observaciones),
      creada,
    };
  }
}
