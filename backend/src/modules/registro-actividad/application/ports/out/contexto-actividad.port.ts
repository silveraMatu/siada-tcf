import type { ActorActividad } from '../../../domain/entities/evento-actividad.domain.js';

//los casos de uso aportan datos al evento de la petición en curso; no escriben en la bitácora directamente
export abstract class ContextoActividadPort {
  //quién actuó, cuando todavía no hay sesión (login, registro) o difiere del usuario autenticado
  abstract actor(actor: ActorActividad): void;
  abstract entidad(tipo: string, id: number): void;
  abstract organismo(organismoId: number): void;
  abstract cuentaMensual(cuentaMensualId: number): void;
  //suma datos al detalle del evento (se combinan con los anteriores)
  abstract detalle(datos: Record<string, unknown>): void;
}
