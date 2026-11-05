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
  type EventoIA,
  type PasoIA,
  type RespuestaIA,
} from '../ports/out/asistente-ia.port.js';

export const MENSAJE_ASISTENTE_NO_DISPONIBLE =
  'El asistente no está disponible en este momento. Intente nuevamente.';

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
  //lo que hizo el modelo para llegar a la respuesta, en lenguaje natural (vacío si no consultó nada)
  pasos: PasoIA[];
}

//lo que se emite en vivo: igual que el de la IA, pero la respuesta final trae el organismo consultado
export type EventoAsistente =
  | Exclude<EventoIA, { tipo: 'respuesta' }>
  | { tipo: 'respuesta'; respuesta: string; organismoId: number | null };

//una consulta ya validada y lista para enviarse a la IA; su construcción es lo único que puede fallar con 400/403/404
export interface ConsultaPreparada {
  consulta: ConsultaIA;
  inicio: number;
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

  //consulta completa: devuelve la respuesta y todos sus pasos de una vez
  async execute(consulta: ConsultaAsistente): Promise<RespuestaAsistente> {
    const preparada = await this.preparar(consulta);
    let respuesta: RespuestaIA;
    try {
      respuesta = await this.asistente.consultar(preparada.consulta);
    } catch (error) {
      throw this.aHttp(error);
    }
    this.registrarResultado(
      preparada.inicio,
      respuesta.respuesta.length,
      respuesta.pasos,
    );
    return {
      respuesta: respuesta.respuesta,
      organismoId: preparada.consulta.organismoId,
      pasos: respuesta.pasos,
    };
  }

  //consulta en vivo: primero abre el flujo contra la IA (un servicio caído o sin configurar falla acá, con su código
  //HTTP normal) y devuelve los eventos a medida que ocurren. Al terminar, aunque sea por un fallo o porque el cliente
  //se fue, deja en la bitácora las cantidades
  async transmitir(
    preparada: ConsultaPreparada,
    cancelacion?: AbortSignal,
  ): Promise<AsyncGenerator<EventoAsistente>> {
    let origen: AsyncIterable<EventoIA>;
    try {
      origen = await this.asistente.iniciarConsultaEnVivo(
        preparada.consulta,
        cancelacion,
      );
    } catch (error) {
      throw this.aHttp(error);
    }
    return this.reenviar(origen, preparada);
  }

  private async *reenviar(
    origen: AsyncIterable<EventoIA>,
    preparada: ConsultaPreparada,
  ): AsyncGenerator<EventoAsistente> {
    //el último estado de cada paso, en el orden en que aparecieron
    const pasos = new Map<string, PasoIA>();
    let longitudRespuesta = 0;
    try {
      for await (const evento of origen) {
        if (evento.tipo === 'paso') {
          pasos.set(evento.paso.id, evento.paso);
          yield evento;
        } else if (evento.tipo === 'respuesta') {
          longitudRespuesta = evento.respuesta.length;
          yield {
            tipo: 'respuesta',
            respuesta: evento.respuesta,
            organismoId: preparada.consulta.organismoId,
          };
        } else {
          yield evento;
        }
      }
    } catch (error) {
      throw this.aHttp(error);
    } finally {
      this.registrarResultado(preparada.inicio, longitudRespuesta, [
        ...pasos.values(),
      ]);
    }
  }

  //todo lo que puede fallar con 400/403/404 y el armado de lo que se le manda a la IA
  async preparar(consulta: ConsultaAsistente): Promise<ConsultaPreparada> {
    const inicio = Date.now();
    //en la bitácora solo el largo: la pregunta puede traer datos sensibles y la bitácora no se puede borrar
    this.actividad.detalle({ preguntaLongitud: consulta.pregunta.length });

    const organismoId =
      consulta.organismoId ?? (await this.organismoAsignado(consulta.actor));

    //sin organismo la IA responde que no se está auditando ninguno: no hay datos que consultar ni que validar
    if (organismoId === null) {
      return {
        inicio,
        consulta: {
          pregunta: consulta.pregunta,
          organismoId: null,
          metadatosOrganismo: null,
          contextoRendicion: null,
        },
      };
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

    return {
      inicio,
      consulta: {
        pregunta: consulta.pregunta,
        organismoId,
        metadatosOrganismo: {
          nombre: organismo.nombre,
          rubro: organismo.rubro,
          activo: organismo.active,
        },
        contextoRendicion,
      },
    };
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

  //un error de la IA como la excepción HTTP que corresponde; cualquier otra cosa se deja pasar
  private aHttp(error: unknown): unknown {
    if (error instanceof AsistenteNoConfiguradoError) {
      return new ServiceUnavailableException(
        'El asistente no está configurado.',
      );
    }
    if (error instanceof AsistenteNoDisponibleError) {
      return new BadGatewayException(MENSAJE_ASISTENTE_NO_DISPONIBLE);
    }
    return error;
  }

  //en la bitácora solo cantidades: el texto, los datos y los motivos del modelo son contenido de rendiciones y no se
  //pueden borrar de ahí. Cuenta solo los pasos que terminaron
  private registrarResultado(
    inicio: number,
    respuestaLongitud: number,
    pasos: PasoIA[],
  ): void {
    const terminados = pasos.filter(
      (p) => p.accion === 'consulta_datos' && p.estado !== 'en_curso',
    );
    this.actividad.detalle({
      respuestaLongitud,
      duracionMs: Date.now() - inicio,
      consultasSql: terminados.length,
      consultasConError: terminados.filter((p) => p.estado === 'error').length,
    });
  }
}
