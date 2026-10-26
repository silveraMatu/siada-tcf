import type { IngresosEgresosGuardado } from '../types';

export interface ResumenIngresosEgresos {
  filas: number;
  /** Primera y última fecha (YYYY-MM-DD); null si no hay filas. */
  fechaDesde: string | null;
  fechaHasta: string | null;
  /** Cuándo se cargó, ISO. */
  cargadoEl: string;
}

/** Qué trae el libro cargado, sin abrirlo. Las fechas son ISO: el mínimo y el máximo salen comparando texto. */
export function resumirIngresosEgresos(
  libro: IngresosEgresosGuardado,
): ResumenIngresosEgresos {
  const fechas = libro.transacciones.map((t) => t.fecha).filter(Boolean);

  return {
    filas: libro.transacciones.length,
    fechaDesde:
      fechas.length > 0 ? fechas.reduce((a, b) => (a <= b ? a : b)) : null,
    fechaHasta:
      fechas.length > 0 ? fechas.reduce((a, b) => (a >= b ? a : b)) : null,
    cargadoEl: libro.fechaCreacion,
  };
}
