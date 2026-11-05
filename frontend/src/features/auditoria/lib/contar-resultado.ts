import { etiquetaDeTipo } from '@/features/libro-banco/lib/formato-libro';
import type {
  ContadoresRegla,
  ResultadoValidacion,
} from '../types/auditoria.types';

/** «Libro Banco» para `LIBRO_BANCO`; un tipo que no conocemos se muestra con su código. */
export function nombreDeLibroFaltante(codigo: string): string {
  return etiquetaDeTipo(codigo);
}

/**
 * La regla no corrió solo porque falta el RACI, que es un libro opcional: no es un problema de la
 * rendición ni la deja «incompleta», así que se muestra aparte de las omitidas por faltar un libro obligatorio.
 */
export function esNoAplica(resultado: ResultadoValidacion): boolean {
  return (
    resultado.estado === 'FALTAN_LIBROS' &&
    resultado.librosFaltantes.length > 0 &&
    resultado.librosFaltantes.every((libro) => libro === 'RACI')
  );
}

/**
 * ✗ controles con observación · ✓ controles sin diferencias · ⏱ libros que faltan. Los totales los
 * informa el motor: una regla que no corrió no tiene filas evaluadas, y una que corrió no tiene libros faltantes.
 */
export function contarResultado(
  resultado: ResultadoValidacion,
): ContadoresRegla {
  if (resultado.estado === 'FALTAN_LIBROS') {
    return {
      falladas: 0,
      verificadas: 0,
      // un estado sin lista de libros sigue siendo, al menos, un libro que falta
      librosFaltantes: Math.max(resultado.librosFaltantes.length, 1),
    };
  }

  const falladas = resultado.observaciones.length;
  const evaluadas = resultado.filasEvaluadas;
  return {
    falladas,
    verificadas: evaluadas === null ? null : Math.max(evaluadas - falladas, 0),
    librosFaltantes: 0,
  };
}
