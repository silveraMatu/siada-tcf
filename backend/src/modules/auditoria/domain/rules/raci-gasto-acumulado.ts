import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { aCentavos, aMonto, TOLERANCIA_CENTAVOS } from './montos.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';
import type { TransaccionRaci } from '../../../raci/domain/entities/transaccion-raci.domain.js';

//asientos del RACI en el orden de carga (por id); copia, no muta el original
export const asientosEnOrden = (context: AuditoriaContext): TransaccionRaci[] =>
  [...(context.raci?.transacciones ?? [])].sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0),
  );

//comparación de dos acumulados del mismo asiento: `mayor` no puede superar a `tope` (más la tolerancia)
export function validarTopeAcumulado(
  context: AuditoriaContext,
  codigo: validationsCode,
  columnas: {
    mayor: (t: TransaccionRaci) => number;
    tope: (t: TransaccionRaci) => number;
    descripcion: (mayor: string, tope: string, diferencia: string) => string;
  },
): ResultadoRegla {
  const asientos = asientosEnOrden(context);
  const observaciones: Observaciones[] = [];

  for (const tx of asientos) {
    const mayor = aCentavos(columnas.mayor(tx));
    const tope = aCentavos(columnas.tope(tx));
    const diferencia = mayor - tope;
    if (diferencia > TOLERANCIA_CENTAVOS) {
      observaciones.push(
        new Observaciones({
          cuentaMensualId: context.cuentaMensualId,
          codigoRegla: codigo,
          tipo: validationsType.INTERNA,
          descripcion: columnas.descripcion(
            aMonto(mayor),
            aMonto(tope),
            aMonto(diferencia),
          ),
          libroOrigen: LibroOrigen.RACI,
          estado: EstadoObservacion.ABIERTA,
          transaccionRaciId: tx.id,
          valorInformado: mayor / 100,
          valorCalculado: tope / 100,
          diferencia: diferencia / 100,
        }),
      );
    }
  }

  return {
    codigoRegla: codigo,
    estado:
      observaciones.length > 0
        ? EstadoValidacion.FALLO
        : EstadoValidacion.VERIFICADO,
    observaciones,
    filasEvaluadas: asientos.length,
  };
}
