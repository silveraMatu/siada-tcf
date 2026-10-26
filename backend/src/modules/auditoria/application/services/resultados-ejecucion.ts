import type { ResumenResultado } from '../../domain/entities/ejecucion-auditoria.domain.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import type { ResultadoValidacion } from '../../domain/types/auditoria.types.js';

//lo que se guarda de cada regla en la ejecución (los hallazgos van en la tabla de observaciones)
export function aResumen(resultado: ResultadoValidacion): ResumenResultado {
  return {
    codigoRegla: resultado.codigoRegla,
    estado: resultado.estado,
    ...(resultado.mensaje !== undefined && { mensaje: resultado.mensaje }),
    filasEvaluadas: resultado.filasEvaluadas,
    librosFaltantes: resultado.librosFaltantes,
  };
}

//reconstruye el resultado de cada regla juntando lo guardado en la ejecución con sus observaciones
export function componerResultados(
  resumenes: ResumenResultado[],
  observaciones: Observaciones[],
): ResultadoValidacion[] {
  const porRegla = new Map<string, Observaciones[]>();
  for (const observacion of observaciones) {
    const lista = porRegla.get(observacion.codigoRegla) ?? [];
    lista.push(observacion);
    porRegla.set(observacion.codigoRegla, lista);
  }
  return resumenes.map((resumen) => ({
    ...resumen,
    observaciones: porRegla.get(resumen.codigoRegla) ?? [],
  }));
}
