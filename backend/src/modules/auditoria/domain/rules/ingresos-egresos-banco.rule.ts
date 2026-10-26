import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { validarSaldosConsecutivos } from './ingresos-egresos-saldos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//V2: en el libro de ingresos y egresos, bancoSaldo = bancoSaldo anterior + bancoDebe - bancoHaber
export class IngresosEgresosV2Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V2;
  readonly descripcion = descripcionRegla[validationsCode.V2];
  readonly librosRequeridos: NombreLibro[] = ['INGRESOS_EGRESOS'];

  execute(context: AuditoriaContext) {
    return validarSaldosConsecutivos(context, this.codigo, {
      nombre: 'banco',
      debe: (t) => t.bancoDebe,
      haber: (t) => t.bancoHaber,
      saldo: (t) => t.bancoSaldo,
    });
  }
}
