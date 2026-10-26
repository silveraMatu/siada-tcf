import { describe, expect, it } from 'vitest';

import type { LibroBancoGuardado } from '../types';
import { libroAFilas } from './libro-a-filas';

const libro = (
  transacciones: LibroBancoGuardado['transacciones'],
): LibroBancoGuardado => ({
  id: 1,
  cuentaMensualId: 5,
  numeroCuentaCte: '123/4',
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  subidoPorId: 1,
  subidoPor: null,
  hashContenido: 'a'.repeat(64),
  transacciones,
});

describe('libroAFilas', () => {
  it('numera las filas desde 1 y no marca errores', () => {
    const filas = libroAFilas(
      libro([
        {
          id: 10,
          fecha: '2026-03-02',
          cheque: '0001',
          aLaOrdenDe: 'Proveedor SA',
          depositos: 0,
          retiro: 1500.5,
          saldo: 8499.5,
        },
        {
          id: 11,
          fecha: '2026-03-05',
          cheque: null,
          aLaOrdenDe: 'Coparticipación',
          depositos: 2000,
          retiro: 0,
          saldo: 10499.5,
        },
      ]),
    );

    expect(filas.map((f) => f.fila)).toEqual([1, 2]);
    expect(filas.every((f) => f.errores.length === 0)).toBe(true);
    expect(filas[0].transaccion).toEqual({
      fecha: '2026-03-02',
      cheque: '0001',
      aLaOrdenDe: 'Proveedor SA',
      depositos: 0,
      retiro: 1500.5,
      saldo: 8499.5,
    });
  });

  it('convierte los null del backend en campos ausentes', () => {
    const [fila] = libroAFilas(
      libro([
        {
          id: 1,
          fecha: null,
          cheque: null,
          aLaOrdenDe: 'X',
          depositos: 1,
          retiro: 0,
          saldo: 1,
        },
      ]),
    );

    expect(fila.transaccion.fecha).toBeUndefined();
    expect(fila.transaccion.cheque).toBeUndefined();
  });

  it('un libro sin transacciones da una lista vacía', () => {
    expect(libroAFilas(libro([]))).toEqual([]);
  });
});
