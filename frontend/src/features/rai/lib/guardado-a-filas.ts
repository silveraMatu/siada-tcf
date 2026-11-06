import type { FilaRaiPreview, RaiGuardado } from '../types';

/** Los asientos guardados con la forma de la vista previa (sin errores: ya pasaron la validación). */
export function guardadoAFilas(libro: RaiGuardado): FilaRaiPreview[] {
  return libro.transacciones.map(
    ({ id, asiento, planillaNumero, ...resto }, indice) => ({
      fila: indice + 1,
      id,
      transaccion: {
        ...resto,
        ...(asiento !== null ? { asiento } : {}),
        ...(planillaNumero ? { planillaNumero } : {}),
      },
      errores: [],
    }),
  );
}
