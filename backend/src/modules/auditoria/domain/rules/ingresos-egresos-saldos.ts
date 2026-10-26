import type { TransaccionIngresoEgreso } from '../../../ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
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

//copia ordenada por número de fila del archivo (y por id si se repite): define cuál es la fila anterior y la última
export const ordenarPorFila = (
  transacciones: readonly TransaccionIngresoEgreso[],
): TransaccionIngresoEgreso[] =>
  [...transacciones].sort(
    (a, b) => a.fila - b.fila || (a.id ?? 0) - (b.id ?? 0),
  );

//qué columnas forman el saldo que se controla (caja o banco)
export interface ColumnasSaldo {
  nombre: string; //ej: 'caja', para el texto de la observación
  debe: (t: TransaccionIngresoEgreso) => number;
  haber: (t: TransaccionIngresoEgreso) => number;
  saldo: (t: TransaccionIngresoEgreso) => number;
}

//cada fila debe cumplir saldo anterior + debe - haber = saldo informado; la primera fila es la base
//(arrastra el saldo del mes anterior, no se valida) y siempre se parte del saldo informado para
//marcar solo la fila incorrecta y evitar errores en cascada
export function validarSaldosConsecutivos(
  context: AuditoriaContext,
  codigo: validationsCode,
  columnas: ColumnasSaldo,
): ResultadoRegla {
  const observaciones: Observaciones[] = [];
  const transacciones = ordenarPorFila(
    context.ingresosEgresos?.transacciones ?? [],
  );

  if (transacciones.length > 0) {
    let saldoPrevio = aCentavos(columnas.saldo(transacciones[0]));

    for (const tx of transacciones.slice(1)) {
      const calculado =
        saldoPrevio +
        aCentavos(columnas.debe(tx)) -
        aCentavos(columnas.haber(tx));
      const informado = aCentavos(columnas.saldo(tx));
      const diferencia = Math.abs(calculado - informado);

      if (diferencia > TOLERANCIA_CENTAVOS) {
        observaciones.push(
          new Observaciones({
            cuentaMensualId: context.cuentaMensualId,
            codigoRegla: codigo,
            tipo: validationsType.INTERNA,
            descripcion: `Error de fórmula en la fila ${tx.fila}: el saldo de ${columnas.nombre} calculado (${aMonto(calculado)}) no coincide con el saldo informado (${aMonto(informado)}). Diferencia: ${aMonto(diferencia)}.`,
            libroOrigen: LibroOrigen.INGRESOS_EGRESOS,
            estado: EstadoObservacion.ABIERTA,
            transaccionIngresoEgresoId: tx.id,
            valorInformado: informado / 100,
            valorCalculado: calculado / 100,
            diferencia: diferencia / 100,
          }),
        );
      }

      saldoPrevio = informado;
    }
  }

  return {
    codigoRegla: codigo,
    estado:
      observaciones.length > 0
        ? EstadoValidacion.FALLO
        : EstadoValidacion.VERIFICADO,
    observaciones,
    //la primera fila es la base: se validan las demás
    filasEvaluadas: Math.max(transacciones.length - 1, 0),
  };
}
