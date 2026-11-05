import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { aCentavos, aMonto } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { asientosEnOrden } from './raci-gasto-acumulado.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//V4: un gasto no puede tener pago sin devengado ni compromiso. Cada asiento trae una sola etapa, así que se mira
//lo acumulado: si el pago acumulado es mayor que 0, el devengado y el compromiso acumulados también deben serlo
export class RaciSecuenciaGastoV4Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V4;
  readonly descripcion = descripcionRegla[validationsCode.V4];
  readonly librosRequeridos: NombreLibro[] = ['RACI'];

  execute(context: AuditoriaContext): ResultadoRegla {
    const asientos = asientosEnOrden(context);
    const observaciones: Observaciones[] = [];

    for (const tx of asientos) {
      const pago = aCentavos(tx.pagoAcumulado);
      const devengado = aCentavos(tx.devengadoAcumulado);
      const compromiso = aCentavos(tx.compromisoAcumulado);
      if (pago <= 0 || (devengado > 0 && compromiso > 0)) continue;

      const faltan = [
        devengado <= 0 ? `devengado (${aMonto(devengado)})` : null,
        compromiso <= 0 ? `compromiso (${aMonto(compromiso)})` : null,
      ].filter((texto) => texto !== null);
      observaciones.push(
        new Observaciones({
          cuentaMensualId: context.cuentaMensualId,
          codigoRegla: this.codigo,
          tipo: validationsType.INTERNA,
          descripcion: `Gasto fuera de secuencia: el pago acumulado es ${aMonto(pago)} pero no hay ${faltan.join(' ni ')} acumulado.`,
          libroOrigen: LibroOrigen.RACI,
          estado: EstadoObservacion.ABIERTA,
          transaccionRaciId: tx.id,
          //lo pagado sin respaldo es el importe en discrepancia
          valorInformado: pago / 100,
          valorCalculado: 0,
          diferencia: pago / 100,
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
      filasEvaluadas: asientos.length,
    };
  }
}
