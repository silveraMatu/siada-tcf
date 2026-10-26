import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ContextoActividadPort } from '../../../../application/ports/out/contexto-actividad.port.js';
import { ContextoActividad } from '../../../../domain/entities/contexto-actividad.domain.js';
import type { ActorActividad } from '../../../../domain/entities/evento-actividad.domain.js';

export const CLAVE_CONTEXTO_ACTIVIDAD = 'contextoActividad';

//el contexto de la petición vive en el almacenamiento asíncrono de nestjs-cls; fuera de una petición
//HTTP (CLI, pruebas unitarias) no hay contexto y las llamadas no hacen nada
@Injectable()
export class ClsContextoActividadAdapter extends ContextoActividadPort {
  constructor(private readonly cls: ClsService) {
    super();
  }

  private contexto(): ContextoActividad | undefined {
    return this.cls.isActive()
      ? this.cls.get<ContextoActividad | undefined>(CLAVE_CONTEXTO_ACTIVIDAD)
      : undefined;
  }

  actor(actor: ActorActividad): void {
    const contexto = this.contexto();
    if (contexto) contexto.actor = actor;
  }

  entidad(tipo: string, id: number): void {
    const contexto = this.contexto();
    if (!contexto) return;
    contexto.entidadTipo = tipo;
    contexto.entidadId = id;
  }

  organismo(organismoId: number): void {
    const contexto = this.contexto();
    if (contexto) contexto.organismoId = organismoId;
  }

  cuentaMensual(cuentaMensualId: number): void {
    const contexto = this.contexto();
    if (contexto) contexto.cuentaMensualId = cuentaMensualId;
  }

  detalle(datos: Record<string, unknown>): void {
    const contexto = this.contexto();
    if (contexto) Object.assign(contexto.detalle, datos);
  }
}
