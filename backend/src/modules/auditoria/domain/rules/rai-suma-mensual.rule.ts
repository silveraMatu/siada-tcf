import type { TransaccionRai } from '../../../rai/domain/entities/transaccion-rai.domain.js';
import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { aCentavos, aMonto, TOLERANCIA_CENTAVOS } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//asientos del RAI en el orden de carga (por id); copia, no muta el original
export const asientosRaiEnOrden = (
  context: AuditoriaContext,
): TransaccionRai[] =>
  [...(context.rai?.transacciones ?? [])].sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0),
  );

//V7: en cada mes, la suma de los ingresos diarios debe ser igual a los ingresos mensuales que informa la planilla,
//que son el acumulado del mes: se compara con el de la última fila de ese mes. El hallazgo se ata a esa fila (un
//solo hallazgo por mes)
export class RaiSumaMensualV7Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V7;
  readonly descripcion = descripcionRegla[validationsCode.V7];
  readonly librosRequeridos: NombreLibro[] = ['RAI'];

  execute(context: AuditoriaContext): ResultadoRegla {
    const porMes = new Map<string, TransaccionRai[]>();
    for (const tx of asientosRaiEnOrden(context)) {
      const mes = tx.fecha.slice(0, 7); //AAAA-MM
      porMes.set(mes, [...(porMes.get(mes) ?? []), tx]);
    }

    const observaciones: Observaciones[] = [];
    for (const [mes, asientos] of porMes) {
      const suma = asientos.reduce(
        (total, t) => total + aCentavos(t.ingresosDiarios),
        0,
      );
      const ultima = asientos[asientos.length - 1];
      const informado = aCentavos(ultima.ingresosMensuales);
      const diferencia = Math.abs(suma - informado);
      if (diferencia <= TOLERANCIA_CENTAVOS) continue;

      observaciones.push(
        new Observaciones({
          cuentaMensualId: context.cuentaMensualId,
          codigoRegla: this.codigo,
          tipo: validationsType.INTERNA,
          descripcion: `Inconsistencia suma mensual: la suma de los ingresos diarios de ${mes} (${aMonto(suma)}) no coincide con los ingresos mensuales informados (${aMonto(informado)}). Diferencia: ${aMonto(diferencia)}.`,
          libroOrigen: LibroOrigen.RAI,
          estado: EstadoObservacion.ABIERTA,
          transaccionRaiId: ultima.id,
          valorInformado: informado / 100,
          valorCalculado: suma / 100,
          diferencia: diferencia / 100,
        }),
      );
    }

    return {
      codigoRegla: this.codigo,
      estado:
        observaciones.length > 0
          ? EstadoValidacion.FALLO
          : EstadoValidacion.VERIFICADO,
      observaciones,
      filasEvaluadas: porMes.size, //una comprobación por mes
    };
  }
}
