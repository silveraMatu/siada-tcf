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

//C3: el total de ingresos del mes en el RAI debe ser igual al total de ingresos (municipal y otras) del libro de
//ingresos y egresos. Es de toda la rendición: el control por partida llega con el modelo de partidas. Una sola
//observación de cuenta (sin fila), con el RAI como libro informado
export class CruceIngresosC3Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.C3;
  readonly descripcion = descripcionRegla[validationsCode.C3];
  readonly librosRequeridos: NombreLibro[] = ['RAI', 'INGRESOS_EGRESOS'];

  execute(context: AuditoriaContext): ResultadoRegla {
    const totalRai = (context.rai?.transacciones ?? []).reduce(
      (total, t) => total + aCentavos(t.ingresosDiarios),
      0,
    );
    const totalIngresosEgresos = (
      context.ingresosEgresos?.transacciones ?? []
    ).reduce(
      (total, t) =>
        total + aCentavos(t.ingresoMunicipal) + aCentavos(t.ingresoOtras),
      0,
    );

    const diferencia = Math.abs(totalRai - totalIngresosEgresos);
    const observaciones =
      diferencia > TOLERANCIA_CENTAVOS
        ? [
            new Observaciones({
              cuentaMensualId: context.cuentaMensualId,
              codigoRegla: this.codigo,
              tipo: validationsType.CRUZAMIENTO,
              descripcion: `Inconsistencia en ingresos: el total de ingresos del mes del RAI (${aMonto(totalRai)}) no coincide con el total de ingresos (municipal y otras) del libro de Ingresos y Egresos (${aMonto(totalIngresosEgresos)}). Diferencia: ${aMonto(diferencia)}.`,
              libroOrigen: LibroOrigen.RAI,
              estado: EstadoObservacion.ABIERTA,
              valorInformado: totalRai / 100,
              valorCalculado: totalIngresosEgresos / 100,
              diferencia: diferencia / 100,
            }),
          ]
        : [];

    return {
      codigoRegla: this.codigo,
      estado:
        observaciones.length > 0
          ? EstadoValidacion.FALLO
          : EstadoValidacion.VERIFICADO,
      observaciones,
      filasEvaluadas: 1, //una comparación: un total contra otro
    };
  }
}
