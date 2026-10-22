import type { FilaPreview, LibroBancoGuardado } from '../types';

/** Adapta un libro ya guardado a las filas de `PreviewTable` (sin errores: ya pasó la validación). */
export function libroAFilas(libro: LibroBancoGuardado): FilaPreview[] {
  return libro.transacciones.map((t, i) => ({
    fila: i + 1,
    transaccion: {
      fecha: t.fecha ?? undefined,
      cheque: t.cheque ?? undefined,
      aLaOrdenDe: t.aLaOrdenDe,
      depositos: t.depositos,
      retiro: t.retiro,
      saldo: t.saldo,
    },
    errores: [],
  }));
}
