import { etiquetaDeTipo } from '@/features/libro-banco/lib/formato-libro';
import type {
  ContadoresRegla,
  ResultadoValidacion,
} from '../types/auditoria.types';

/** Cantidad de transacciones de cada libro cargado que la regla recorre. */
export interface LibroParaContar {
  tipo: string;
  cantidadTransacciones: number;
}

const PREFIJO_FALTANTES = /^Faltan libros requeridos:\s*(.*)$/i;

/** Códigos de los libros que faltan, leídos de «Faltan libros requeridos: A, B». */
export function librosFaltantes(mensaje: string | undefined): string[] {
  const coincidencia = mensaje ? PREFIJO_FALTANTES.exec(mensaje.trim()) : null;
  if (!coincidencia) return [];
  return coincidencia[1]
    .split(',')
    .map((codigo) => codigo.trim())
    .filter(Boolean);
}

/** «Libro Banco» para `LIBRO_BANCO`; un tipo que no conocemos se muestra con su código. */
export function nombreDeLibroFaltante(codigo: string): string {
  return etiquetaDeTipo(codigo);
}

/**
 * Cuántas filas recorre cada regla. V3 toma la primera fila de cada libro como saldo base y valida las
 * demás. Una regla que no figura acá devuelve `null`: no inventamos un total que no conocemos.
 */
const FILAS_EVALUADAS: Record<
  string,
  (libros: readonly LibroParaContar[]) => number
> = {
  V3: (libros) =>
    libros
      .filter((libro) => libro.tipo === 'LIBRO_BANCO')
      .reduce(
        (total, libro) => total + Math.max(libro.cantidadTransacciones - 1, 0),
        0,
      ),
};

export function filasEvaluadas(
  codigoRegla: string,
  libros: readonly LibroParaContar[],
): number | null {
  return FILAS_EVALUADAS[codigoRegla]?.(libros) ?? null;
}

/** ✗ filas con observación · ✓ filas verificadas · ⏱ libros que faltan. */
export function contarResultado(
  resultado: ResultadoValidacion,
  libros: readonly LibroParaContar[],
): ContadoresRegla {
  if (resultado.estado === 'FALTAN_LIBROS') {
    const faltantes = librosFaltantes(resultado.mensaje).length;
    return {
      falladas: 0,
      verificadas: 0,
      // un mensaje que no se pudo leer sigue siendo, al menos, un libro que falta
      librosFaltantes: Math.max(faltantes, 1),
    };
  }

  const falladas = resultado.observaciones.length;
  const evaluadas = filasEvaluadas(resultado.codigoRegla, libros);
  return {
    falladas,
    verificadas: evaluadas === null ? null : Math.max(evaluadas - falladas, 0),
    librosFaltantes: 0,
  };
}
