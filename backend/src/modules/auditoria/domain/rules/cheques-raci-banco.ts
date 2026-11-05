import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { normalizarCheque } from './cheques.js';
import { aCentavos } from './montos.js';

//lo que el libro banco registra por cada N° de cheque: la suma en centavos de los retiros de las filas que lo
//llevan (un cheque puede repetirse en varias filas). Los cheques se comparan normalizados
export function retirosPorCheque(
  libros: readonly LibroBanco[] | undefined,
): Map<string, number> {
  const retiros = new Map<string, number>();
  for (const libro of libros ?? []) {
    for (const t of libro.transacciones) {
      const cheque = normalizarCheque(t.cheque);
      if (cheque === null) continue;
      retiros.set(cheque, (retiros.get(cheque) ?? 0) + aCentavos(t.retiro));
    }
  }
  return retiros;
}
