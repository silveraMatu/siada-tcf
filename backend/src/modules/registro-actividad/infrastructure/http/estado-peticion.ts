import type { ContextoActividad } from '../../domain/entities/contexto-actividad.domain.js';
import type { OpcionesRegistrar } from './registrar.decorator.js';

//lo que el guard deja asociado a cada petición para que el interceptor y el filtro armen el evento
export interface EstadoPeticion {
  meta?: OpcionesRegistrar;
  contexto: ContextoActividad;
}

//clave: el objeto request; así no hace falta ampliar sus tipos
export const estadosPeticion = new WeakMap<object, EstadoPeticion>();
