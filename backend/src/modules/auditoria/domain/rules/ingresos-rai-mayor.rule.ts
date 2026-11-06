import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { ordenarPorFila } from './ingresos-egresos-saldos.js';
import { aCentavos, aMonto, TOLERANCIA_CENTAVOS } from './montos.js';
import { asientosRaiEnOrden } from './rai-suma-mensual.rule.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//P3: cada ingreso del RAI debe tener su registro en el libro de ingresos y egresos (columna municipal u otras): el
//mismo importe, dentro del mismo mes. No se exige la misma fecha porque el RAI puede asentar un ingreso días después.
//Cada fila del libro de ingresos y egresos respalda un solo ingreso del RAI
export class IngresosRaiMayorP3Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.P3;
  readonly descripcion = descripcionRegla[validationsCode.P3];
  readonly librosRequeridos: NombreLibro[] = ['RAI', 'INGRESOS_EGRESOS'];

  execute(context: AuditoriaContext): ResultadoRegla {
    //filas del mayor con sus importes de ingreso, aún sin asignar a un ingreso del RAI
    const disponibles = ordenarPorFila(
      context.ingresosEgresos?.transacciones ?? [],
    ).map((t) => ({
      mes: t.fecha.slice(0, 7),
      importes: [aCentavos(t.ingresoMunicipal), aCentavos(t.ingresoOtras)],
      usada: false,
    }));

    const observaciones: Observaciones[] = [];
    let filasEvaluadas = 0;
    for (const tx of asientosRaiEnOrden(context)) {
      const ingreso = aCentavos(tx.ingresosDiarios);
      if (ingreso <= 0) continue;
      filasEvaluadas++;

      const mes = tx.fecha.slice(0, 7);
      const pareja = disponibles.find(
        (fila) =>
          !fila.usada &&
          fila.mes === mes &&
          fila.importes.some(
            (importe) => Math.abs(importe - ingreso) <= TOLERANCIA_CENTAVOS,
          ),
      );
      if (pareja) {
        pareja.usada = true;
        continue;
      }

      observaciones.push(
        new Observaciones({
          cuentaMensualId: context.cuentaMensualId,
          codigoRegla: this.codigo,
          tipo: validationsType.INTEGRIDAD,
          descripcion: `Ingreso no registrado en el Mayor: el ingreso de ${aMonto(ingreso)} del RAI ("${tx.concepto}", ${tx.fecha}) no tiene un registro igual en el libro de Ingresos y Egresos dentro de ${mes}.`,
          libroOrigen: LibroOrigen.RAI,
          estado: EstadoObservacion.ABIERTA,
          transaccionRaiId: tx.id,
          //lo recaudado sin registro en el mayor es el importe en discrepancia
          valorInformado: ingreso / 100,
          valorCalculado: 0,
          diferencia: ingreso / 100,
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
      filasEvaluadas,
    };
  }
}
