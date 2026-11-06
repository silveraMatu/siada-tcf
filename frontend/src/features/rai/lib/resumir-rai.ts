import type { PersonaResumen } from '@/lib/persona';
import type { RaiGuardado } from '../types';

export interface ResumenRai {
  asientos: number;
  /** Primera y última fecha (YYYY-MM-DD); null si no hay asientos. */
  fechaDesde: string | null;
  fechaHasta: string | null;
  /** Cuándo se cargó, ISO. */
  cargadoEl: string;
  /** Quién lo cargó; null si no se puede resolver. */
  subidoPor: PersonaResumen | null;
}

/** Qué trae el libro cargado, sin abrirlo. Las fechas son ISO: el mínimo y el máximo salen comparando texto. */
export function resumirRai(libro: RaiGuardado): ResumenRai {
  const fechas = libro.transacciones.map((t) => t.fecha).filter(Boolean);

  return {
    asientos: libro.transacciones.length,
    fechaDesde:
      fechas.length > 0 ? fechas.reduce((a, b) => (a <= b ? a : b)) : null,
    fechaHasta:
      fechas.length > 0 ? fechas.reduce((a, b) => (a >= b ? a : b)) : null,
    cargadoEl: libro.fechaCreacion,
    subidoPor: libro.subidoPor,
  };
}
