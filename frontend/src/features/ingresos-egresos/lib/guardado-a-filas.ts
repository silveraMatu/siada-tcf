import type {
  FilaIngresoEgresoPreview,
  IngresosEgresosGuardado,
} from '../types';

/** Las filas guardadas con la forma de la vista previa (sin errores: ya pasaron la validación). */
export function guardadoAFilas(
  libro: IngresosEgresosGuardado,
): FilaIngresoEgresoPreview[] {
  return libro.transacciones.map(
    ({ id: _id, cheque, comprobante, cuentasVariasConcepto, ...resto }) => ({
      transaccion: {
        ...resto,
        ...(cheque ? { cheque } : {}),
        ...(comprobante ? { comprobante } : {}),
        ...(cuentasVariasConcepto ? { cuentasVariasConcepto } : {}),
      },
      errores: [],
    }),
  );
}
