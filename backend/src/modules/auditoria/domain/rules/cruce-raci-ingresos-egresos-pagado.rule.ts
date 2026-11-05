import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import {
  compararTotalesRaciIngresosEgresos,
  sumarRaci,
} from './cruce-raci-ingresos-egresos.js';
import { normalizarCheque } from './cheques.js';
import { aCentavos } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//C2: el total pagado del mes con cheque en el RACI debe ser igual al total de banco haber del libro de ingresos
//y egresos
export class CrucePagadoC2Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.C2;
  readonly descripcion = descripcionRegla[validationsCode.C2];
  readonly librosRequeridos: NombreLibro[] = ['RACI', 'INGRESOS_EGRESOS'];

  execute(context: AuditoriaContext) {
    const totalBancoHaber = (
      context.ingresosEgresos?.transacciones ?? []
    ).reduce((total, t) => total + aCentavos(t.bancoHaber), 0);

    return compararTotalesRaciIngresosEgresos(
      context,
      this.codigo,
      'Inconsistencias en pagos',
      {
        raci: 'el total pagado con cheque del mes',
        ingresosEgresos: 'el total de banco haber',
      },
      sumarRaci(
        context,
        (t) => t.pagoDelMes,
        (t) => normalizarCheque(t.pagoNumeroCheque) !== null,
      ),
      totalBancoHaber,
    );
  }
}
