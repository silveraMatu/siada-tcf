import { Injectable } from '@nestjs/common';
import type { ContextoActividad } from '../../domain/entities/contexto-actividad.domain.js';
import {
  EventoActividad,
  type ActorActividad,
} from '../../domain/entities/evento-actividad.domain.js';
import type { AccionActividad } from '../../domain/enums/accion-actividad.enum.js';
import type { ResultadoActividad } from '../../domain/enums/resultado-actividad.enum.js';
import { RegistroActividadRepositoryPort } from '../ports/out/registro-actividad-repository.port.js';

const MAX_USER_AGENT = 255;

export interface RegistrarActividadComando {
  accion: AccionActividad;
  resultado: ResultadoActividad;
  codigoHttp: number;
  //usuario autenticado de la petición, si lo hay; el contexto puede pisarlo (login, registro)
  actorAutenticado: ActorActividad | null;
  contexto: ContextoActividad;
  //lo que el endpoint declaró sobre la entidad; los casos de uso pueden precisarlo en el contexto
  entidadTipo?: string | null;
  entidadId?: number | null;
  organismoId?: number | null;
  cuentaMensualId?: number | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

//arma el evento con lo que declaró el endpoint y lo que sumaron los casos de uso, y lo guarda
@Injectable()
export class RegistrarActividadUseCase {
  constructor(private readonly repository: RegistroActividadRepositoryPort) {}

  async execute(comando: RegistrarActividadComando): Promise<void> {
    const { contexto } = comando;
    const detalle = Object.keys(contexto.detalle).length
      ? contexto.detalle
      : null;

    await this.repository.guardar(
      new EventoActividad({
        accion: comando.accion,
        resultado: comando.resultado,
        codigoHttp: comando.codigoHttp,
        ocurridoEn: new Date(),
        actor: contexto.actor ?? comando.actorAutenticado,
        ip: comando.ip,
        userAgent: comando.userAgent
          ? comando.userAgent.slice(0, MAX_USER_AGENT)
          : null,
        requestId: comando.requestId,
        entidadTipo: contexto.entidadTipo ?? comando.entidadTipo ?? null,
        entidadId: contexto.entidadId ?? comando.entidadId ?? null,
        organismoId: contexto.organismoId ?? comando.organismoId ?? null,
        cuentaMensualId:
          contexto.cuentaMensualId ?? comando.cuentaMensualId ?? null,
        detalle,
      }),
    );
    contexto.registrado = true;
  }
}
