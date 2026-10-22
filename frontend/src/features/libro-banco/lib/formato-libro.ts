import { TIPOS_LIBRO } from '@/features/cuentas/constants';
import type { ResumenLibro } from '@/features/cuentas/types';

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** «Libro Banco»: cómo se llama el tipo de libro; si llega uno nuevo que no conocemos, su código. */
export function etiquetaDeTipo(tipo: ResumenLibro['tipo']): string {
  return TIPOS_LIBRO[tipo as keyof typeof TIPOS_LIBRO] ?? tipo;
}

/**
 * Cómo se nombra un libro dentro de una rendición: por su N° de cuenta corriente (propio del libro
 * banco); los demás libros, por su tipo.
 */
export function nombreDeLibro(
  libro: Pick<ResumenLibro, 'tipo' | 'numeroCuentaCte'>,
): string {
  if (libro.tipo !== 'LIBRO_BANCO') return etiquetaDeTipo(libro.tipo);
  return libro.numeroCuentaCte
    ? `Cta. Cte. ${libro.numeroCuentaCte}`
    : 'Sin N° de cuenta';
}

/** `2026-03-28` → `28/03/2026`. Se arma con el texto, sin `Date`, para que la zona horaria no corra el día. */
export function formatearFecha(iso: string): string {
  const partes = FECHA_ISO.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

/** «01/03/2026 al 28/03/2026», una sola fecha si coinciden, o «Sin fechas». */
export function describirRangoFechas(
  desde: string | null,
  hasta: string | null,
): string {
  if (!desde && !hasta) return 'Sin fechas';
  if (!desde || !hasta || desde === hasta) {
    return formatearFecha((desde ?? hasta) as string);
  }
  return `${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
}

export function describirTransacciones(cantidad: number): string {
  return cantidad === 1 ? '1 transacción' : `${cantidad} transacciones`;
}

export function describirLibrosCargados(cantidad: number): string {
  return cantidad === 1 ? '1 libro cargado' : `${cantidad} libros cargados`;
}
