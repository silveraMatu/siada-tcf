import type { NombreLibro, ResultadoRegla } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import type { validationsCode } from './validations.js';

//una regla determinística de auditoría; el motor solo la ejecuta si están todos sus libros requeridos
export interface ReglaAuditoria {
  codigo: validationsCode;
  descripcion: string;
  librosRequeridos: NombreLibro[];
  execute(contexto: AuditoriaContext): ResultadoRegla;
}
