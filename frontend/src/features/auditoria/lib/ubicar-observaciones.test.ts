import { describe, expect, it } from 'vitest';

import type { LibroBancoGuardado } from '@/features/libro-banco/types';
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

const libros: LibroBancoGuardado[] = [
  {
    id: 1,
    cuentaMensualId: 5,
    numeroCuentaCte: '100/1',
    fechaCreacion: '2026-10-15T12:00:00.000Z',
    transacciones: [transaccion(10), transaccion(11)],
  },
  {
    id: 2,
    cuentaMensualId: 5,
    numeroCuentaCte: '200/2',
    fechaCreacion: '2026-10-15T12:00:00.000Z',
    transacciones: [transaccion(20), transaccion(21), transaccion(12)],
  },
];

const [observacion] = MOCK_RESULTADOS[0].observaciones; // transaccionId 12

describe('ubicarObservaciones', () => {
  it('encuentra el libro y la fila (base 1) de la transacción', () => {
    expect(ubicarObservaciones([observacion], libros)).toEqual([
      {
        id: 1,
        mensaje: observacion.descripcion,
        transaccionId: 12,
        libroId: 2,
        libroNombre: 'Cta. Cte. 200/2',
        fila: 3,
      },
    ]);
  });

  it('sin los libros cargados o con una transacción que ya no existe, queda sin ubicar', () => {
    for (const ubicadas of [
      ubicarObservaciones([observacion], undefined),
      ubicarObservaciones([{ ...observacion, transaccionId: 999 }], libros),
    ]) {
      expect(ubicadas).toHaveLength(1);
      expect(ubicadas[0].fila).toBeUndefined();
      expect(ubicadas[0].libroId).toBeUndefined();
    }
  });

  it('una observación de toda la cuenta (sin transacción) no tiene fila', () => {
    const [ubicada] = ubicarObservaciones(
      [{ ...observacion, transaccionId: null }],
      libros,
    );
    expect(ubicada.transaccionId).toBeNull();
    expect(ubicada.fila).toBeUndefined();
  });
});
