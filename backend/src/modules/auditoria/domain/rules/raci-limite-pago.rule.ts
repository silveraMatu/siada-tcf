import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { validarTopeAcumulado } from './raci-gasto-acumulado.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//V6: lo pagado acumulado no puede superar lo devengado acumulado
export class RaciLimitePagoV6Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V6;
  readonly descripcion = descripcionRegla[validationsCode.V6];
  readonly librosRequeridos: NombreLibro[] = ['RACI'];

  execute(context: AuditoriaContext) {
    return validarTopeAcumulado(context, this.codigo, {
      mayor: (t) => t.pagoAcumulado,
      tope: (t) => t.devengadoAcumulado,
      descripcion: (pago, devengado, diferencia) =>
        `Pago excede lo devengado: el pago acumulado (${pago}) supera al devengado acumulado (${devengado}). Diferencia: ${diferencia}.`,
    });
  }
}
