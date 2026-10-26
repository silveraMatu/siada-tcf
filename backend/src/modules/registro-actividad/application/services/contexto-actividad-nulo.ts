import { ContextoActividadPort } from '../ports/out/contexto-actividad.port.js';

//no registra nada: para pruebas unitarias y procesos fuera de una petición HTTP
export class ContextoActividadNulo extends ContextoActividadPort {
  actor(): void {}
  entidad(): void {}
  organismo(): void {}
  cuentaMensual(): void {}
  detalle(): void {}
}
