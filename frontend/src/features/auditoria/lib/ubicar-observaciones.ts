import type { ResumenLibro } from '@/features/cuentas/types';
import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
import {
  etiquetaDeTipo,
  nombreDeLibro,
} from '@/features/libro-banco/lib/formato-libro';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import type { RaciGuardado } from '@/features/raci/types';
import type {
  ObservacionApi,
  ObservacionUbicada,
} from '../types/auditoria.types';

interface Ubicacion {
  libroTipo: ResumenLibro['tipo'];
  libroId: number;
  libroNombre: string;
  fila?: number;
  asiento?: number;
}

export interface LibrosParaUbicar {
  librosBanco?: readonly LibroBancoGuardado[];
  ingresosEgresos?: IngresosEgresosGuardado | null;
  raci?: RaciGuardado | null;
}

/**
 * Busca el libro y la fila de cada observación a partir del id de su transacción. En el libro banco la
 * fila se numera como la tabla (posición base 1); en Ingresos y Egresos, como el archivo (campo `fila`), que
 * es también el número que cita el texto del hallazgo. Un hallazgo de toda la cuenta (un cruce entre
 * libros) no tiene fila: queda con el nombre del libro de origen. En el RACI no hay fila sino **asiento**: se
 * cita por su N° de asiento, que es el que figura en la planilla. Si todavía no se cargaron los
 * libros, o la transacción ya no existe, queda sin ubicar.
 */
export function ubicarObservaciones(
  observaciones: readonly ObservacionApi[],
  { librosBanco, ingresosEgresos, raci }: LibrosParaUbicar,
): ObservacionUbicada[] {
  const banco = new Map<number, Ubicacion>();
  for (const libro of librosBanco ?? []) {
    const libroNombre = nombreDeLibro({
      tipo: 'LIBRO_BANCO',
      numeroCuentaCte: libro.numeroCuentaCte,
    });
    libro.transacciones.forEach((transaccion, indice) => {
      banco.set(transaccion.id, {
        libroTipo: 'LIBRO_BANCO',
        libroId: libro.id,
        libroNombre,
        fila: indice + 1,
      });
    });
  }

  const ingresosEgresosPorId = new Map<number, Ubicacion>();
  for (const transaccion of ingresosEgresos?.transacciones ?? []) {
    ingresosEgresosPorId.set(transaccion.id, {
      libroTipo: 'INGRESOS_EGRESOS',
      libroId: ingresosEgresos!.id,
      libroNombre: etiquetaDeTipo('INGRESOS_EGRESOS'),
      fila: transaccion.fila,
    });
  }

  const raciPorId = new Map<number, Ubicacion>();
  for (const transaccion of raci?.transacciones ?? []) {
    raciPorId.set(transaccion.id, {
      libroTipo: 'RACI',
      libroId: raci!.id,
      libroNombre: etiquetaDeTipo('RACI'),
      asiento: transaccion.asiento,
    });
  }

  return observaciones.map((observacion) => {
    const { transaccionId, transaccionIngresoEgresoId, transaccionRaciId } =
      observacion;
    const ubicacion =
      transaccionIngresoEgresoId !== null
        ? ingresosEgresosPorId.get(transaccionIngresoEgresoId)
        : transaccionRaciId !== null
          ? raciPorId.get(transaccionRaciId)
          : transaccionId !== null
            ? banco.get(transaccionId)
            : undefined;

    return {
      id: observacion.id,
      mensaje: observacion.descripcion,
      estado: observacion.estado,
      valorInformado: observacion.valorInformado,
      valorCalculado: observacion.valorCalculado,
      diferencia: observacion.diferencia,
      motivoDescarte: observacion.motivoDescarte,
      revisadaPor: observacion.revisadaPor,
      revisadaEn: observacion.revisadaEn,
      transaccionId:
        transaccionIngresoEgresoId ?? transaccionRaciId ?? transaccionId,
      ...ubicacion,
      // sin fila (cruce entre libros) se nombra igual el libro del que sale el hallazgo
      ...(!ubicacion &&
      transaccionId === null &&
      transaccionIngresoEgresoId === null &&
      transaccionRaciId === null
        ? { libroNombre: etiquetaDeTipo(observacion.libroOrigen) }
        : undefined),
    };
  });
}
