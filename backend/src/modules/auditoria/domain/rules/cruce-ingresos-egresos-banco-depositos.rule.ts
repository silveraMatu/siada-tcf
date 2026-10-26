import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import {
  compararTotales,
  sumarLibrosBanco,
} from './cruce-ingresos-egresos-banco.js';
import { aCentavos } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//C4: el total de bancoDebe del libro de ingresos y egresos debe ser igual al total de depósitos de los libros banco
export class CruceDepositosC4Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.C4;
  readonly descripcion = descripcionRegla[validationsCode.C4];
  readonly librosRequeridos: NombreLibro[] = [
    'LIBRO_BANCO',
    'INGRESOS_EGRESOS',
  ];

  execute(context: AuditoriaContext) {
    const totalIngresosEgresos = (
      context.ingresosEgresos?.transacciones ?? []
    ).reduce((total, t) => total + aCentavos(t.bancoDebe), 0);

    return compararTotales(
      context,
      this.codigo,
      'Inconsistencia de depósitos bancarios',
      {
        ingresosEgresos: 'el total de banco debe',
        banco: 'el total de depósitos',
      },
      totalIngresosEgresos,
      sumarLibrosBanco(context.librosBanco, (t) => t.depositos),
    );
  }
}
