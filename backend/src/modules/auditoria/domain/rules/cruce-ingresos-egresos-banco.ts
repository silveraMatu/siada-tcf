import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import type { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type ResultadoValidacion,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { aCentavos, aMonto, TOLERANCIA_CENTAVOS } from './montos.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//suma en centavos de una columna de todas las filas de todos los libros banco de la rendición
export const sumarLibrosBanco = (
  libros: readonly LibroBanco[] | undefined,
  columna: (t: TransaccionLibroBanco) => number,
): number =>
  (libros ?? []).reduce(
    (total, libro) =>
      total +
      libro.transacciones.reduce((sub, t) => sub + aCentavos(columna(t)), 0),
    0,
  );

//suma en centavos del saldo de la última fila de cada libro banco (por id, el orden de carga);
//los libros sin filas no suman
export const sumarSaldosFinalesBanco = (
  libros: readonly LibroBanco[] | undefined,
): number =>
  (libros ?? []).reduce((total, libro) => {
    const ultima = libro.transacciones.reduce<TransaccionLibroBanco | null>(
      (mayor, t) =>
        mayor === null || (t.id ?? 0) >= (mayor.id ?? 0) ? t : mayor,
      null,
    );
    return total + (ultima ? aCentavos(ultima.saldo) : 0);
  }, 0);

//cruce entre un total del libro de ingresos y egresos y su equivalente del libro banco: una sola
//observación de cuenta (sin fila) si difieren más que la tolerancia
export function compararTotales(
  context: AuditoriaContext,
  codigo: validationsCode,
  titulo: string,
  conceptos: { ingresosEgresos: string; banco: string },
  totalIngresosEgresos: number,
  totalBanco: number,
): ResultadoValidacion {
  const diferencia = Math.abs(totalIngresosEgresos - totalBanco);
  const observaciones =
    diferencia > TOLERANCIA_CENTAVOS
      ? [
          new Observaciones(
            context.cuentaMensualId,
            codigo,
            validationsType.CRUZAMIENTO,
            `${titulo}: ${conceptos.ingresosEgresos} del libro de Ingresos y Egresos (${aMonto(totalIngresosEgresos)}) no coincide con ${conceptos.banco} del Libro Banco (${aMonto(totalBanco)}). Diferencia: ${aMonto(diferencia)}.`,
            LibroOrigen.INGRESOS_EGRESOS,
            EstadoObservacion.ABIERTA,
          ),
        ]
      : [];

  return {
    codigoRegla: codigo,
    estado:
      observaciones.length > 0
        ? EstadoValidacion.FALLO
        : EstadoValidacion.VERIFICADO,
    observaciones,
  };
}
