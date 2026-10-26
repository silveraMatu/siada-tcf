import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoValidacion,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//en centavos enteros no hay error de coma flotante
const aCentavos = (monto: number): number => Math.round(monto * 100);
const aMonto = (centavos: number): string => (centavos / 100).toFixed(2);

//diferencia tolerada entre saldo calculado e informado
const TOLERANCIA_CENTAVOS = 1;

//V3: cada fila debe cumplir saldo anterior + depósitos - retiro = saldo informado
export class LibroBancoV3Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.V3;
  readonly descripcion = descripcionRegla[validationsCode.V3];
  readonly librosRequeridos: NombreLibro[] = ['LIBRO_BANCO'];

  execute(context: AuditoriaContext): ResultadoValidacion {
    const observaciones: Observaciones[] = [];

    //cada ingesta crea un libro nuevo entonces se evalúan por separado
    for (const libro of context.librosBanco ?? []) {
      //copia ordenada por id
      const transacciones = [...libro.transacciones].sort(
        (a, b) => (a.id ?? 0) - (b.id ?? 0),
      );
      if (transacciones.length < 2) continue;

      //la primera fila es la base, su saldo inicial no se valida
      let saldoPrevio = aCentavos(transacciones[0].saldo);

      for (let i = 1; i < transacciones.length; i++) {
        const tx = transacciones[i];
        const calculado =
          saldoPrevio + aCentavos(tx.depositos) - aCentavos(tx.retiro);
        const informado = aCentavos(tx.saldo);
        const diferencia = Math.abs(calculado - informado);

        if (diferencia > TOLERANCIA_CENTAVOS) {
          observaciones.push(
            new Observaciones(
              context.cuentaMensualId,
              validationsCode.V3,
              validationsType.INTERNA,
              `El saldo calculado (${aMonto(calculado)}) no coincide con el saldo informado (${aMonto(informado)}). Diferencia: ${aMonto(diferencia)}.`,
              LibroOrigen.LIBRO_BANCO,
              EstadoObservacion.ABIERTA,
              undefined,
              tx.id,
            ),
          );
        }

        //se parte siempre del saldo informado, marca solo la fila incorrecta y evita errores en cascada
        saldoPrevio = informado;
      }
    }

    return {
      codigoRegla: this.codigo,
      estado:
        observaciones.length > 0
          ? EstadoValidacion.FALLO
          : EstadoValidacion.VERIFICADO,
      observaciones,
    };
  }
}
