import type {
  EstadoValidacion,
  ResultadoValidacion,
  ResumenResultados,
} from '../types/auditoria.types';

export function resumirResultados(
  resultados: readonly ResultadoValidacion[],
): ResumenResultados {
  const resumen: ResumenResultados = {
    verificadas: 0,
    fallidas: 0,
    omitidas: 0,
    observaciones: 0,
  };
  for (const resultado of resultados) {
    if (resultado.estado === 'VERIFICADO') resumen.verificadas++;
    else if (resultado.estado === 'FALLO') {
      resumen.fallidas++;
      resumen.observaciones += resultado.observaciones.length;
    } else resumen.omitidas++;
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

export function filtrarPorEstado(
  resultados: readonly ResultadoValidacion[],
  estado: EstadoValidacion | null,
): ResultadoValidacion[] {
  return estado === null
    ? [...resultados]
    : resultados.filter((resultado) => resultado.estado === estado);
}
