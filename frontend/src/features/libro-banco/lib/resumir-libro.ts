import type { ResumenLibro } from '@/features/cuentas/types';
import type { LibroBancoGuardado } from '../types';

/**
 * El mismo resumen que el backend arma para el listado de rendiciones, calculado desde un libro ya
 * traído con sus transacciones: así la vista del responsable y la del auditor muestran lo mismo.
 * Las fechas son ISO (YYYY-MM-DD), por eso el mínimo y el máximo se sacan comparando texto.
 */
export function resumirLibro(libro: LibroBancoGuardado): ResumenLibro {
  const fechas = libro.transacciones
    .map((t) => t.fecha)
    .filter((fecha): fecha is string => fecha !== null);

  return {
    id: libro.id,
    tipo: 'LIBRO_BANCO',
    numeroCuentaCte: libro.numeroCuentaCte,
    cantidadTransacciones: libro.transacciones.length,
    fechaDesde:
      fechas.length > 0 ? fechas.reduce((a, b) => (a <= b ? a : b)) : null,
    fechaHasta:
      fechas.length > 0 ? fechas.reduce((a, b) => (a >= b ? a : b)) : null,
  };
}
