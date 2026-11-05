import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { retirosPorCheque } from './cheques-raci-banco.js';
import { normalizarCheque } from './cheques.js';
import { aCentavos } from './montos.js';
import { asientosEnOrden } from './raci-gasto-acumulado.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//P1: cada N° de cheque del RACI debe existir en la columna cheque de algún libro banco
export class ChequeExistenciaP1Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.P1;
  readonly descripcion = descripcionRegla[validationsCode.P1];
  readonly librosRequeridos: NombreLibro[] = ['RACI', 'LIBRO_BANCO'];

  execute(context: AuditoriaContext): ResultadoRegla {
    const enBanco = retirosPorCheque(context.librosBanco);
    const observaciones: Observaciones[] = [];
    let filasEvaluadas = 0;

    for (const tx of asientosEnOrden(context)) {
      const cheque = normalizarCheque(tx.pagoNumeroCheque);
      if (cheque === null) continue;
      filasEvaluadas++;
      if (enBanco.has(cheque)) continue;

      const pagado = aCentavos(tx.pagoDelMes);
      observaciones.push(
        new Observaciones({
          cuentaMensualId: context.cuentaMensualId,
          codigoRegla: this.codigo,
          tipo: validationsType.INTEGRIDAD,
          descripcion: `Cheque no registrado en libro banco: el cheque ${tx.pagoNumeroCheque?.trim()} del RACI no figura en ningún Libro Banco de la rendición.`,
          libroOrigen: LibroOrigen.RACI,
          estado: EstadoObservacion.ABIERTA,
          transaccionRaciId: tx.id,
          //lo pagado con un cheque que el banco no registra es el importe en discrepancia
          valorInformado: pagado / 100,
          valorCalculado: 0,
          diferencia: pagado / 100,
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
