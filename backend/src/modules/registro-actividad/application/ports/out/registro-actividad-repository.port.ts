import { EventoActividad } from '../../../domain/entities/evento-actividad.domain.js';
import type { AccionActividad } from '../../../domain/enums/accion-actividad.enum.js';
import type { ResultadoActividad } from '../../../domain/enums/resultado-actividad.enum.js';

export interface FiltrosActividad {
  desde?: Date;
  hasta?: Date;
  usuarioId?: number;
  dni?: string;
  accion?: AccionActividad;
  resultado?: ResultadoActividad;
  organismoId?: number;
  cuentaMensualId?: number;
  entidadTipo?: string;
  entidadId?: number;
}

export interface PaginaActividad {
  eventos: EventoActividad[];
  //id desde el cual pedir la página siguiente; null si no hay más
  siguienteCursor: number | null;
}

export abstract class RegistroActividadRepositoryPort {
  abstract guardar(evento: EventoActividad): Promise<void>;

  //del más reciente al más antiguo; `cursor` es el id del último evento ya visto
  abstract listar(
    filtros: FiltrosActividad,
    limite: number,
    cursor?: number,
  ): Promise<PaginaActividad>;
}
