import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorActividad } from '../../domain/entities/evento-actividad.domain.js';
import { ResultadoActividad } from '../../domain/enums/resultado-actividad.enum.js';
import { RegistrarActividadUseCase } from '../../application/use-cases/registrar-actividad.use-case.js';
import { estadosPeticion } from './estado-peticion.js';

interface UsuarioEnRequest {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  roles: string[];
}

const aNumero = (valor: unknown): number | null => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

//pone a salvo el evento de una petición marcada con @Registrar. Un fallo al guardar nunca rompe la
//respuesta al usuario: se informa como error operativo
@Injectable()
export class ActividadRegistrador {
  private readonly logger = new Logger(ActividadRegistrador.name);

  constructor(private readonly registrar: RegistrarActividadUseCase) {}

  static resultadoDe(codigoHttp: number): ResultadoActividad {
    return codigoHttp === 401 || codigoHttp === 403
      ? ResultadoActividad.DENEGADO
      : ResultadoActividad.FALLO;
  }

  async registrarEvento(
    request: Request,
    resultado: ResultadoActividad,
    codigoHttp: number,
    cuerpoRespuesta?: unknown,
  ): Promise<void> {
    const estado = estadosPeticion.get(request);
    if (!estado?.meta || estado.contexto.registrado) return;
    const { meta, contexto } = estado;

    const usuario = (request as Request & { user?: UsuarioEnRequest }).user;
    const actorAutenticado: ActorActividad | null = usuario
      ? {
          usuarioId: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          dni: usuario.dni,
          roles: usuario.roles,
        }
      : null;

    const idRespuesta =
      meta.idRespuesta && cuerpoRespuesta && typeof cuerpoRespuesta === 'object'
        ? aNumero(
            (cuerpoRespuesta as Record<string, unknown>)[meta.idRespuesta],
          )
        : null;

    try {
      await this.registrar.execute({
        accion: meta.accion,
        resultado,
        codigoHttp,
        actorAutenticado,
        contexto,
        entidadTipo: meta.entidad ?? null,
        entidadId: meta.idParam
          ? aNumero(request.params[meta.idParam])
          : idRespuesta,
        cuentaMensualId: meta.cuentaParam
          ? aNumero(request.params[meta.cuentaParam])
          : null,
        organismoId: meta.organismoParam
          ? aNumero(request.params[meta.organismoParam])
          : null,
        ip: request.ip ?? null,
        userAgent: request.get('user-agent') ?? null,
        requestId: contexto.requestId,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo guardar el evento ${meta.accion} en la bitácora`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
