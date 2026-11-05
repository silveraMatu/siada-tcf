import { describe, expect, it } from 'vitest';

import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import type { RaciGuardado } from '@/features/raci/types';
import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import { ubicarObservaciones } from './ubicar-observaciones';

const transaccion = (id: number) => ({
  id,
  fecha: '2026-03-02',
  cheque: null,
  aLaOrdenDe: 'Proveedor',
  depositos: 0,
  retiro: 0,
  saldo: 0,
});

const librosBanco: LibroBancoGuardado[] = [
  {
    id: 1,
    cuentaMensualId: 5,
    numeroCuentaCte: '100/1',
    fechaCreacion: '2026-10-15T12:00:00.000Z',
    subidoPorId: 1,
    subidoPor: null,
    hashContenido: 'a'.repeat(64),
    transacciones: [transaccion(10), transaccion(11)],
  },
  {
    id: 2,
    cuentaMensualId: 5,
    numeroCuentaCte: '200/2',
    fechaCreacion: '2026-10-15T12:00:00.000Z',
    subidoPorId: 1,
    subidoPor: null,
    hashContenido: 'a'.repeat(64),
    transacciones: [transaccion(20), transaccion(21), transaccion(12)],
  },
];

/** El id de este libro coincide a propósito con el del libro banco 2: se distinguen por tipo. */
const ingresosEgresos = {
  id: 2,
  cuentaMensualId: 5,
  numeroCuentaCte: null,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  subidoPorId: 1,
  subidoPor: null,
  hashContenido: 'a'.repeat(64),
  transacciones: [
    { id: 57, fila: 4 },
    { id: 58, fila: 9 },
  ],
} as unknown as IngresosEgresosGuardado;

/** Su id coincide a propósito con el de los otros dos libros: se distinguen por tipo. */
const raci = {
  id: 2,
  cuentaMensualId: 5,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  subidoPorId: 1,
  subidoPor: null,
  hashContenido: 'a'.repeat(64),
  transacciones: [
    { id: 70, asiento: 3 },
    { id: 71, asiento: 8 },
  ],
} as unknown as RaciGuardado;

const [observacion] = MOCK_RESULTADOS[0].observaciones; // transaccionId 12

describe('ubicarObservaciones', () => {
  it('encuentra el libro banco y la fila (base 1) de la transacción', () => {
    expect(ubicarObservaciones([observacion], { librosBanco })).toEqual([
      {
        id: 1,
        mensaje: observacion.descripcion,
        estado: 'ABIERTA',
        valorInformado: 1400,
        valorCalculado: 1300,
        diferencia: 100,
        motivoDescarte: null,
        revisadaPor: null,
        revisadaEn: null,
        transaccionId: 12,
        libroTipo: 'LIBRO_BANCO',
        libroId: 2,
        libroNombre: 'Cta. Cte. 200/2',
        fila: 3,
      },
    ]);
  });

  it('en Ingresos y Egresos la fila es la del archivo, no la posición en la tabla', () => {
    const [ubicada] = ubicarObservaciones(
      [
        {
          ...observacion,
          codigoRegla: 'V1',
          libroOrigen: 'INGRESOS_EGRESOS',
          transaccionId: null,
          transaccionIngresoEgresoId: 58,
        },
      ],
      { librosBanco, ingresosEgresos },
    );

    expect(ubicada).toMatchObject({
      transaccionId: 58,
      libroTipo: 'INGRESOS_EGRESOS',
      libroId: 2,
      libroNombre: 'Ingresos y Egresos',
      fila: 9,
    });
  });

  it('sin los libros cargados o con una transacción que ya no existe, queda sin ubicar', () => {
    for (const ubicadas of [
      ubicarObservaciones([observacion], {}),
      ubicarObservaciones([{ ...observacion, transaccionId: 999 }], {
        librosBanco,
      }),
      ubicarObservaciones(
        [
          {
            ...observacion,
            transaccionId: null,
            transaccionIngresoEgresoId: 999,
          },
        ],
        { librosBanco, ingresosEgresos },
      ),
    ]) {
      expect(ubicadas).toHaveLength(1);
      expect(ubicadas[0].fila).toBeUndefined();
      expect(ubicadas[0].libroId).toBeUndefined();
    }
  });

  it('un cruce entre libros (de toda la cuenta) no tiene fila pero nombra el libro de origen', () => {
    const [ubicada] = ubicarObservaciones(
      [
        {
          ...observacion,
          codigoRegla: 'C5',
          libroOrigen: 'INGRESOS_EGRESOS',
          transaccionId: null,
          transaccionIngresoEgresoId: null,
        },
      ],
      { librosBanco, ingresosEgresos },
    );

    expect(ubicada.transaccionId).toBeNull();
    expect(ubicada.fila).toBeUndefined();
    expect(ubicada.libroId).toBeUndefined();
    expect(ubicada.libroNombre).toBe('Ingresos y Egresos');
  });

  describe('libro RACI', () => {
    const deRaci = {
      ...observacion,
      codigoRegla: 'V4',
      libroOrigen: 'RACI',
      transaccionId: null,
      transaccionIngresoEgresoId: null,
      transaccionRaciId: 71,
    };

    it('un asiento se cita por su N° de asiento, no por fila, y lleva a ese libro', () => {
      const [ubicada] = ubicarObservaciones([deRaci], {
        librosBanco,
        ingresosEgresos,
        raci,
      });

      expect(ubicada).toMatchObject({
        transaccionId: 71,
        libroTipo: 'RACI',
        libroId: 2,
        libroNombre: 'RACI',
        asiento: 8,
      });
      expect(ubicada.fila).toBeUndefined();
    });

    it('no confunde el id del asiento con el de una transacción de otro libro', () => {
      const [ubicada] = ubicarObservaciones(
        [{ ...deRaci, transaccionRaciId: 58 }],
        { librosBanco, ingresosEgresos, raci },
      );
      // el 58 existe en Ingresos y Egresos pero no en el RACI: queda sin ubicar
      expect(ubicada.libroTipo).toBeUndefined();
      expect(ubicada.transaccionId).toBe(58);
    });

    it('un hallazgo de toda la cuenta (C1, C2) queda con el nombre del libro y sin fila ni asiento', () => {
      const [ubicada] = ubicarObservaciones(
        [{ ...deRaci, codigoRegla: 'C1', transaccionRaciId: null }],
        { librosBanco, ingresosEgresos, raci },
      );
      expect(ubicada).toMatchObject({
        transaccionId: null,
        libroNombre: 'RACI',
      });
      expect(ubicada.libroId).toBeUndefined();
      expect(ubicada.asiento).toBeUndefined();
    });

    it('si el libro todavía no se cargó o el asiento ya no existe, queda sin ubicar', () => {
      expect(ubicarObservaciones([deRaci], {})[0].libroId).toBeUndefined();
      expect(
        ubicarObservaciones([{ ...deRaci, transaccionRaciId: 999 }], {
          raci,
        })[0].libroId,
      ).toBeUndefined();
    });

    it('F1 puede apuntar a un asiento del RACI, a una fila de I/E o a una del banco', () => {
      const f1 = { ...observacion, codigoRegla: 'F1', tipo: 'FECHAS' };
      const ubicadas = ubicarObservaciones(
        [
          {
            ...f1,
            libroOrigen: 'RACI',
            transaccionId: null,
            transaccionIngresoEgresoId: null,
            transaccionRaciId: 70,
          },
          {
            ...f1,
            libroOrigen: 'INGRESOS_EGRESOS',
            transaccionId: null,
            transaccionIngresoEgresoId: 57,
            transaccionRaciId: null,
          },
          {
            ...f1,
            libroOrigen: 'LIBRO_BANCO',
            transaccionId: 10,
            transaccionIngresoEgresoId: null,
            transaccionRaciId: null,
          },
        ],
        { librosBanco, ingresosEgresos, raci },
      );
      expect(ubicadas.map((u) => u.libroTipo)).toEqual([
        'RACI',
        'INGRESOS_EGRESOS',
        'LIBRO_BANCO',
      ]);
    });
  });
});
