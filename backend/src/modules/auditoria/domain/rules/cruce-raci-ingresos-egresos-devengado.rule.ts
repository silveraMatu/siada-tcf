import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import {
  compararTotalesRaciIngresosEgresos,
  sumarRaci,
} from './cruce-raci-ingresos-egresos.js';
import { aCentavos } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//C1: el total devengado del mes en el RACI debe ser igual al total de egresos (incisos 1 a 5) del libro de
//ingresos y egresos
export class CruceDevengadoC1Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.C1;
  readonly descripcion = descripcionRegla[validationsCode.C1];
  readonly librosRequeridos: NombreLibro[] = ['RACI', 'INGRESOS_EGRESOS'];

  execute(context: AuditoriaContext) {
    const totalEgresos = (context.ingresosEgresos?.transacciones ?? []).reduce(
      (total, t) =>
        total +
        aCentavos(t.egresoInc1) +
        aCentavos(t.egresoInc2) +
        aCentavos(t.egresoInc3) +
        aCentavos(t.egresoInc4) +
        aCentavos(t.egresoInc5),
      0,
    );

    return compararTotalesRaciIngresosEgresos(
      context,
      this.codigo,
      'Inconsistencias en gastos devengados',
      {
        raci: 'el total devengado del mes',
        ingresosEgresos: 'el total de egresos (incisos 1 a 5)',
      },
      sumarRaci(context, (t) => t.devengadoDelMes),
      totalEgresos,
    );
  }
}
