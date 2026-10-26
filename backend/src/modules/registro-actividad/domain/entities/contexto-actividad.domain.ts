import type { ActorActividad } from './evento-actividad.domain.js';

//lo que los casos de uso van sumando durante una petición para completar el evento de la bitácora
export class ContextoActividad {
  actor: ActorActividad | null = null;
  entidadTipo: string | null = null;
  entidadId: number | null = null;
  organismoId: number | null = null;
  cuentaMensualId: number | null = null;
  detalle: Record<string, unknown> = {};
  //identifica la petición (el de pino-http si existe, si no el de nestjs-cls)
  requestId: string | null = null;
  //true cuando el evento de esta petición ya se guardó: evita registrarlo dos veces
  registrado = false;
}
