export type NombreDocumento = 'Libro Banco' | 'Ingresos y Egresos';

/** Cantidad de documentos obligatorios de una rendición. */
export const TOTAL_DOCUMENTOS = 2;

/** Cuáles de los documentos obligatorios todavía no se cargaron; vacío si la rendición está completa. */
export function documentosFaltantes({
  librosBanco,
  ingresosEgresos,
}: {
  librosBanco: number;
  ingresosEgresos: boolean;
}): NombreDocumento[] {
  const faltantes: NombreDocumento[] = [];
  if (librosBanco === 0) faltantes.push('Libro Banco');
  if (!ingresosEgresos) faltantes.push('Ingresos y Egresos');
  return faltantes;
}
