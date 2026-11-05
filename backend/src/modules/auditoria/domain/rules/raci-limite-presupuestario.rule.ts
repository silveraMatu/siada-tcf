import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { validarTopeAcumulado } from './raci-gasto-acumulado.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//V5: lo devengado acumulado no puede superar lo comprometido acumulado
export class RaciLimitePresupuestarioV5Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V5;
  readonly descripcion = descripcionRegla[validationsCode.V5];
  readonly librosRequeridos: NombreLibro[] = ['RACI'];

  execute(context: AuditoriaContext) {
    return validarTopeAcumulado(context, this.codigo, {
      mayor: (t) => t.devengadoAcumulado,
      tope: (t) => t.compromisoAcumulado,
      descripcion: (devengado, compromiso, diferencia) =>
        `Sobregiro presupuestario: el devengado acumulado (${devengado}) supera al compromiso acumulado (${compromiso}). Diferencia: ${diferencia}.`,
    });
  }
}
