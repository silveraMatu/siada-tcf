import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import {
  compararTotales,
  sumarLibrosBanco,
} from './cruce-ingresos-egresos-banco.js';
import { aCentavos } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//C5: el total de bancoHaber del libro de ingresos y egresos debe ser igual al total de retiros de los libros banco
export class CruceRetirosC5Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.C5;
  readonly descripcion = descripcionRegla[validationsCode.C5];
  readonly librosRequeridos: NombreLibro[] = [
    'LIBRO_BANCO',
    'INGRESOS_EGRESOS',
  ];

  execute(context: AuditoriaContext) {
    const totalIngresosEgresos = (
      context.ingresosEgresos?.transacciones ?? []
    ).reduce((total, t) => total + aCentavos(t.bancoHaber), 0);

    return compararTotales(
      context,
      this.codigo,
      'Inconsistencia en retiros bancarios',
      {
        ingresosEgresos: 'el total de banco haber',
        banco: 'el total de retiros',
      },
      totalIngresosEgresos,
      sumarLibrosBanco(context.librosBanco, (t) => t.retiro),
    );
  }
}
