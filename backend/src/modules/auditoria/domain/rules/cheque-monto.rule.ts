import type { TransaccionRaci } from '../../../raci/domain/entities/transaccion-raci.domain.js';
import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { retirosPorCheque } from './cheques-raci-banco.js';
import { normalizarCheque } from './cheques.js';
import { aCentavos, aMonto, TOLERANCIA_CENTAVOS } from './montos.js';
import { asientosEnOrden } from './raci-gasto-acumulado.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//P2: lo pagado en el RACI con un cheque debe coincidir con el retiro de ese cheque en el libro banco. Si el cheque
//aparece en varios asientos se compara el total del cheque; los cheques que el banco no tiene los marca P1
export class ChequeMontoP2Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.P2;
  readonly descripcion = descripcionRegla[validationsCode.P2];
  readonly librosRequeridos: NombreLibro[] = ['RACI', 'LIBRO_BANCO'];

  execute(context: AuditoriaContext): ResultadoRegla {
    const enBanco = retirosPorCheque(context.librosBanco);

    const porCheque = new Map<string, TransaccionRaci[]>();
    for (const tx of asientosEnOrden(context)) {
      const cheque = normalizarCheque(tx.pagoNumeroCheque);
      if (cheque === null || !enBanco.has(cheque)) continue;
      porCheque.set(cheque, [...(porCheque.get(cheque) ?? []), tx]);
    }

    const observaciones: Observaciones[] = [];
    let filasEvaluadas = 0;
    for (const [cheque, asientos] of porCheque) {
      filasEvaluadas += asientos.length;
      const informado = asientos.reduce(
        (total, t) => total + aCentavos(t.pagoDelMes),
        0,
      );
      const retiro = enBanco.get(cheque)!;
      const diferencia = Math.abs(informado - retiro);
      if (diferencia <= TOLERANCIA_CENTAVOS) continue;

      for (const tx of asientos) {
        observaciones.push(
          new Observaciones({
            cuentaMensualId: context.cuentaMensualId,
            codigoRegla: this.codigo,
            tipo: validationsType.INTEGRIDAD,
            descripcion: `Monto de cheque inconsistente: el RACI paga ${aMonto(informado)} con el cheque ${tx.pagoNumeroCheque?.trim()} y el Libro Banco registra un retiro de ${aMonto(retiro)}. Diferencia: ${aMonto(diferencia)}.`,
            libroOrigen: LibroOrigen.RACI,
            estado: EstadoObservacion.ABIERTA,
            transaccionRaciId: tx.id,
            valorInformado: informado / 100,
            valorCalculado: retiro / 100,
            diferencia: diferencia / 100,
          }),
        );
      }
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
