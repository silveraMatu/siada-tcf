import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { TipoEntidadActividad } from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';
import {
  AsistenteNoConfiguradoError,
  AsistenteNoDisponibleError,
} from '../../domain/errors/asistente.errors.js';
import {
  AsistenteIAPort,
  type ConsultaIA,
  type PasoIA,
  type RespuestaIA,
} from '../ports/out/asistente-ia.port.js';

export interface ConsultaAsistente {
  actor: ActorAcceso;
  pregunta: string;
  //si falta se usa el único organismo asignado al auditor
  organismoId?: number;
  //ancla la consulta a una rendición de ese organismo
  cuentaMensualId?: number;
}

export interface RespuestaAsistente {
  respuesta: string;
  //organismo sobre el que se consultó; null si el auditor no tiene ninguno
  organismoId: number | null;
  //qué hizo el modelo contra la base para llegar a la respuesta (vacío si no consultó nada)
  pasos: PasoIA[];
}

//el auditor le pregunta al copiloto de IA sobre un organismo. Este caso de uso es la frontera de confianza: el servicio
//de IA limita sus consultas SQL al organismo que reciba, así que acá se valida que el usuario pueda verlo
@Injectable()
export class ConsultarAsistenteUseCase {
  constructor(
    private readonly asistente: AsistenteIAPort,
    private readonly organismoRepository: OrganismoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(consulta: ConsultaAsistente): Promise<RespuestaAsistente> {
    const inicio = Date.now();
    //en la bitácora solo el largo: la pregunta puede traer datos sensibles y la bitácora no se puede borrar
    this.actividad.detalle({ preguntaLongitud: consulta.pregunta.length });

    const organismoId =
      consulta.organismoId ?? (await this.organismoAsignado(consulta.actor));

    //sin organismo la IA responde que no se está auditando ninguno: no hay datos que consultar ni que validar
    if (organismoId === null) {
      return this.preguntar(
        {
          pregunta: consulta.pregunta,
          organismoId: null,
          metadatosOrganismo: null,
          contextoRendicion: null,
        },
        inicio,
      );
    }

    //primero el permiso: un 404 distinto le revelaría a quien no puede verlo qué organismos existen
    this.actividad.organismo(organismoId);
    this.actividad.entidad(TipoEntidadActividad.ORGANISMO, organismoId);
    if (!(await this.accesoCuenta.puedeLeer(consulta.actor, organismoId))) {
      throw new ForbiddenException(
        'El organismo no está entre los que tiene asignados.',
      );
    }

    const organismo = await this.organismoRepository.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(
        `El Organismo con ID ${organismoId} no existe.`,
      );
    }

    const contextoRendicion =
      consulta.cuentaMensualId === undefined
        ? null
        : await this.contextoRendicion(organismoId, consulta.cuentaMensualId);

    return this.preguntar(
      {
        pregunta: consulta.pregunta,
        organismoId,
        metadatosOrganismo: {
          nombre: organismo.nombre,
          rubro: organismo.rubro,
          activo: organismo.active,
        },
        contextoRendicion,
      },
      inicio,
    );
  }

  //el único organismo del auditor; null si no tiene ninguno
  private async organismoAsignado(actor: ActorAcceso): Promise<number | null> {
    const ids = await this.organismoRepository.buscarIdsPorAuditor(
      actor.usuarioId,
    );
    if (ids.length > 1) {
      throw new BadRequestException(
        'Tiene más de un organismo asignado: indique el organismoId.',
      );
    }
    return ids[0] ?? null;
  }

  //la rendición debe ser del organismo consultado; busca solo entre las de ese organismo
  private async contextoRendicion(
    organismoId: number,
    cuentaMensualId: number,
  ): Promise<Record<string, unknown>> {
    const cuentas = await this.cuentaMensualRepository.listar({
      organismoIds: [organismoId],
    });
    const cuenta = cuentas.find((c) => c.id === cuentaMensualId);
    if (!cuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe en ese organismo.`,
      );
    }
    this.actividad.cuentaMensual(cuenta.id);
    //solo lo necesario para ubicar de qué período se habla: nunca DNI, email ni hashes
    return {
      cuentaMensualId: cuenta.id,
      ejercicioFiscal: cuenta.ejercicioFiscal,
      mes: cuenta.mes,
      estado: cuenta.estado,
      presentadaPor: cuenta.presentadaPor
        ? `${cuenta.presentadaPor.nombre} ${cuenta.presentadaPor.apellido}`
        : null,
      presentadaEn: cuenta.presentadaEn?.toISOString() ?? null,
      libros: cuenta.libros.map((l) => ({
        tipo: l.tipo,
        numeroCuentaCte: l.numeroCuentaCte,
        cantidadTransacciones: l.cantidadTransacciones,
        fechaDesde: l.fechaDesde,
        fechaHasta: l.fechaHasta,
      })),
    };
  }

  private async preguntar(
    consulta: ConsultaIA,
    inicio: number,
  ): Promise<RespuestaAsistente> {
    let respuesta: RespuestaIA;
    try {
      respuesta = await this.asistente.consultar(consulta);
    } catch (error) {
      if (error instanceof AsistenteNoConfiguradoError) {
        throw new ServiceUnavailableException(
          'El asistente no está configurado.',
        );
      }
      if (error instanceof AsistenteNoDisponibleError) {
        throw new BadGatewayException(
          'El asistente no está disponible en este momento. Intente nuevamente.',
        );
      }
      throw error;
    }
    //en la bitácora solo cantidades: el SQL y las filas son contenido de rendiciones y no se pueden borrar de ahí
    this.actividad.detalle({
      respuestaLongitud: respuesta.respuesta.length,
      duracionMs: Date.now() - inicio,
      consultasSql: respuesta.pasos.filter((p) => p.accion === 'consulta_sql')
        .length,
      consultasConError: respuesta.pasos.filter((p) => p.error !== null).length,
    });
    return {
      respuesta: respuesta.respuesta,
      organismoId: consulta.organismoId,
      pasos: respuesta.pasos,
    };
  }
}
