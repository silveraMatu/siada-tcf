import type { FilaRaciPreview, RaciGuardado } from '../types';

/** Los asientos guardados con la forma de la vista previa (sin errores: ya pasaron la validación). */
export function guardadoAFilas(libro: RaciGuardado): FilaRaciPreview[] {
  return libro.transacciones.map(
    (
      {
        id,
        expediente,
        compromisoInstrumentoLegal,
        compromisoOrdenProvision,
        devengadoOrdenPago,
        pagoNumeroCheque,
        ...resto
      },
      indice,
    ) => ({
      fila: indice + 1,
      id,
      transaccion: {
        ...resto,
        ...(expediente ? { expediente } : {}),
        ...(compromisoInstrumentoLegal ? { compromisoInstrumentoLegal } : {}),
        ...(compromisoOrdenProvision ? { compromisoOrdenProvision } : {}),
        ...(devengadoOrdenPago ? { devengadoOrdenPago } : {}),
        ...(pagoNumeroCheque ? { pagoNumeroCheque } : {}),
      },
      errores: [],
    }),
  );
}
