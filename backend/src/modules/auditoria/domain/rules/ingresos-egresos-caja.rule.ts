import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { validarSaldosConsecutivos } from './ingresos-egresos-saldos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//V1: en el libro de ingresos y egresos, cajaSaldo = cajaSaldo anterior + cajaDebe - cajaHaber
export class IngresosEgresosV1Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V1;
  readonly descripcion = descripcionRegla[validationsCode.V1];
  readonly librosRequeridos: NombreLibro[] = ['INGRESOS_EGRESOS'];

  execute(context: AuditoriaContext) {
    return validarSaldosConsecutivos(context, this.codigo, {
      nombre: 'caja',
      debe: (t) => t.cajaDebe,
      haber: (t) => t.cajaHaber,
      saldo: (t) => t.cajaSaldo,
    });
  }
}
