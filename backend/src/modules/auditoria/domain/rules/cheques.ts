//el N° de cheque llega como texto libre de cada libro: se normaliza para compararlo entre libros. Sin espacios
//ni minúsculas y, si son solo dígitos, sin ceros a la izquierda (una celda numérica de Excel los pierde)
export function normalizarCheque(
  cheque: string | null | undefined,
): string | null {
  const texto = (cheque ?? '').trim().toUpperCase();
  if (texto === '') return null;
  return /^\d+$/.test(texto) ? texto.replace(/^0+(?=\d)/, '') : texto;
}
