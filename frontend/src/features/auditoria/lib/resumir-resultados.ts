import type {
  EstadoValidacion,
  ResultadoValidacion,
  ResumenResultados,
} from '../types/auditoria.types';
import { esNoAplica } from './contar-resultado';

export function resumirResultados(
  resultados: readonly ResultadoValidacion[],
): ResumenResultados {
  const resumen: ResumenResultados = {
    verificadas: 0,
    fallidas: 0,
    omitidas: 0,
    noAplican: 0,
    observaciones: 0,
  };
  for (const resultado of resultados) {
    if (resultado.estado === 'VERIFICADO') resumen.verificadas++;
    else if (resultado.estado === 'FALLO') {
      resumen.fallidas++;
      resumen.observaciones += resultado.observaciones.length;
    } else if (esNoAplica(resultado)) resumen.noAplican++;
    else resumen.omitidas++;
  }
  return resumen;
}

/** Reglas por código (V1, V2, …, V10), con un orden estable que no cambia entre ejecuciones. */
export function ordenarPorCodigo(
  resultados: readonly ResultadoValidacion[],
): ResultadoValidacion[] {
  return [...resultados].sort((a, b) =>
    a.codigoRegla.localeCompare(b.codigoRegla, 'es', { numeric: true }),
  );
}

/**
 * Reglas con ese resultado. «Omitidas» son las que faltan por un libro obligatorio: las que no aplican
 * porque no hay RACI (opcional) no entran, igual que en el contador de la tarjeta.
 */
export function filtrarPorEstado(
  resultados: readonly ResultadoValidacion[],
  estado: EstadoValidacion | null,
): ResultadoValidacion[] {
  return estado === null
    ? [...resultados]
    : resultados.filter(
        (resultado) =>
          resultado.estado === estado &&
          !(estado === 'FALTAN_LIBROS' && esNoAplica(resultado)),
      );
}
