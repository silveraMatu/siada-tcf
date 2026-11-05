import type { TransaccionRaci } from '../../../raci/domain/entities/transaccion-raci.domain.js';
import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { aCentavos, aMonto, TOLERANCIA_CENTAVOS } from './montos.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//cruce entre un total del RACI (libro auxiliar) y su equivalente del libro de ingresos y egresos (el mayor): una
//sola observación de cuenta (sin fila) si difieren más que la tolerancia. Es de toda la rendición: el control por
//partida llega con el modelo de partidas
export function compararTotalesRaciIngresosEgresos(
  context: AuditoriaContext,
  codigo: validationsCode,
  titulo: string,
  conceptos: { raci: string; ingresosEgresos: string },
  totalRaci: number,
  totalIngresosEgresos: number,
): ResultadoRegla {
  const diferencia = Math.abs(totalRaci - totalIngresosEgresos);
  const observaciones =
    diferencia > TOLERANCIA_CENTAVOS
      ? [
          new Observaciones({
            cuentaMensualId: context.cuentaMensualId,
            codigoRegla: codigo,
            tipo: validationsType.CRUZAMIENTO,
            descripcion: `${titulo}: ${conceptos.raci} del RACI (${aMonto(totalRaci)}) no coincide con ${conceptos.ingresosEgresos} del libro de Ingresos y Egresos (${aMonto(totalIngresosEgresos)}). Diferencia: ${aMonto(diferencia)}.`,
            libroOrigen: LibroOrigen.RACI,
            estado: EstadoObservacion.ABIERTA,
            //el libro auditado es el RACI; el esperado, lo que dice el libro de ingresos y egresos
            valorInformado: totalRaci / 100,
            valorCalculado: totalIngresosEgresos / 100,
            diferencia: diferencia / 100,
          }),
        ]
      : [];

  return {
    codigoRegla: codigo,
    estado:
      observaciones.length > 0
        ? EstadoValidacion.FALLO
        : EstadoValidacion.VERIFICADO,
    observaciones,
    filasEvaluadas: 1, //una comparación: un total contra otro
  };
}

//suma en centavos de una columna de todos los asientos del RACI que cumplen el filtro
export const sumarRaci = (
  context: AuditoriaContext,
  columna: (t: TransaccionRaci) => number,
  filtro: (t: TransaccionRaci) => boolean = () => true,
): number =>
  (context.raci?.transacciones ?? [])
    .filter(filtro)
    .reduce((total, t) => total + aCentavos(columna(t)), 0);
