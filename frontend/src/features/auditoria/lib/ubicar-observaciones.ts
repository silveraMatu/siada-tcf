import { nombreDeLibro } from '@/features/libro-banco/lib/formato-libro';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import type {
  ObservacionApi,
  ObservacionUbicada,
} from '../types/auditoria.types';

/**
 * Busca el libro y la fila de cada observación a partir de su `transaccionId`. La fila se numera igual
 * que la tabla del libro (posición base 1), así que el auditor la encuentra con el mismo número.
 * Si todavía no se cargaron los libros, o la transacción ya no existe, queda sin ubicar.
 */
export function ubicarObservaciones(
  observaciones: readonly ObservacionApi[],
  libros: readonly LibroBancoGuardado[] | undefined,
): ObservacionUbicada[] {
  const ubicaciones = new Map<
    number,
    { libroId: number; libroNombre: string; fila: number }
  >();
  for (const libro of libros ?? []) {
    const libroNombre = nombreDeLibro({
      tipo: 'LIBRO_BANCO',
      numeroCuentaCte: libro.numeroCuentaCte,
    });
    libro.transacciones.forEach((transaccion, indice) => {
      ubicaciones.set(transaccion.id, {
        libroId: libro.id,
        libroNombre,
        fila: indice + 1,
      });
    });
  }

  return observaciones.map((observacion) => ({
    id: observacion.id,
    mensaje: observacion.descripcion,
    transaccionId: observacion.transaccionId,
    ...(observacion.transaccionId === null
      ? undefined
      : ubicaciones.get(observacion.transaccionId)),
  }));
}
