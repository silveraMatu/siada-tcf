import type { Observaciones } from '../entities/observaciones.domain.js';
import type { AuditoriaContext } from './auditoria-context.js';

//una regla determinística de auditoría, devuelve los hallazgos (vacío si no hay)
export interface ReglaAuditoria {
  execute(context: AuditoriaContext): Observaciones[];
}
