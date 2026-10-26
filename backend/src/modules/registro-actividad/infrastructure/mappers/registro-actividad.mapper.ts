import { EventoActividad } from '../../domain/entities/evento-actividad.domain.js';
import type { AccionActividad } from '../../domain/enums/accion-actividad.enum.js';
import type { ResultadoActividad } from '../../domain/enums/resultado-actividad.enum.js';
import { RegistroActividadEntity } from '../entities/registro-actividad.entity.js';

export class RegistroActividadMapper {
  static toEntity(evento: EventoActividad): RegistroActividadEntity {
    const entity = new RegistroActividadEntity();
    entity.ocurridoEn = evento.ocurridoEn;
    entity.usuarioId = evento.actor?.usuarioId ?? null;
    entity.nombre = evento.actor?.nombre ?? null;
    entity.apellido = evento.actor?.apellido ?? null;
    entity.dni = evento.actor?.dni ?? null;
    entity.roles = evento.actor?.roles ?? [];
    entity.ip = evento.ip;
    entity.userAgent = evento.userAgent;
    entity.accion = evento.accion;
    entity.resultado = evento.resultado;
    entity.codigoHttp = evento.codigoHttp;
    entity.entidadTipo = evento.entidadTipo;
    entity.entidadId = evento.entidadId;
    entity.organismoId = evento.organismoId;
    entity.cuentaMensualId = evento.cuentaMensualId;
    entity.detalle = evento.detalle;
    entity.requestId = evento.requestId;
    return entity;
  }

  static toDomain(entity: RegistroActividadEntity): EventoActividad {
    //sin nombre ni DNI no hubo un usuario identificado (login fallido, petición sin sesión)
    const hayActor =
      entity.nombre !== null ||
      entity.dni !== null ||
      entity.usuarioId !== null;
    return new EventoActividad({
      id: Number(entity.id),
      ocurridoEn: entity.ocurridoEn,
      accion: entity.accion as AccionActividad,
      resultado: entity.resultado as ResultadoActividad,
      codigoHttp: entity.codigoHttp,
      actor: hayActor
        ? {
            usuarioId: entity.usuarioId,
            nombre: entity.nombre ?? '',
            apellido: entity.apellido ?? '',
            dni: entity.dni ?? '',
            roles: entity.roles,
          }
        : null,
      ip: entity.ip,
      userAgent: entity.userAgent,
      requestId: entity.requestId,
      entidadTipo: entity.entidadTipo,
      entidadId: entity.entidadId,
      organismoId: entity.organismoId,
      cuentaMensualId: entity.cuentaMensualId,
      detalle: entity.detalle,
    });
  }
}
