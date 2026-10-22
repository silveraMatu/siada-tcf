import { describe, expect, it } from 'vitest';

import type { LibroBancoGuardado, TransaccionGuardada } from '../types';
import { resumirLibro } from './resumir-libro';

const transaccion = (
  id: number,
  fecha: string | null,
): TransaccionGuardada => ({
  id,
  fecha,
  cheque: null,
  aLaOrdenDe: 'Proveedor',
  depositos: 0,
  retiro: 1,
  saldo: 1,
});

const libro = (transacciones: TransaccionGuardada[]): LibroBancoGuardado => ({
  id: 7,
  cuentaMensualId: 5,
  numeroCuentaCte: '100234/1',
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  transacciones,
});

describe('resumirLibro', () => {
  it('toma la cantidad de transacciones y el N° de cuenta del libro', () => {
    expect(
      resumirLibro(libro([transaccion(1, '2026-03-02'), transaccion(2, null)])),
    ).toMatchObject({
      id: 7,
      tipo: 'LIBRO_BANCO',
      numeroCuentaCte: '100234/1',
      cantidadTransacciones: 2,
    });
  });

  it('el rango de fechas es de la mínima a la máxima, no de la primera a la última fila', () => {
    const resumen = resumirLibro(
      libro([
        transaccion(1, '2026-03-10'),
        transaccion(2, '2026-03-02'),
        transaccion(3, '2026-03-25'),
        transaccion(4, null),
      ]),
    );

    expect(resumen.fechaDesde).toBe('2026-03-02');
    expect(resumen.fechaHasta).toBe('2026-03-25');
  });

  it('con una sola fecha el rango empieza y termina en ella', () => {
    const resumen = resumirLibro(libro([transaccion(1, '2026-04-02')]));

    expect(resumen.fechaDesde).toBe('2026-04-02');
    expect(resumen.fechaHasta).toBe('2026-04-02');
  });

  it('si ninguna transacción trae fecha, no hay rango', () => {
    const resumen = resumirLibro(
      libro([transaccion(1, null), transaccion(2, null)]),
    );

    expect(resumen.fechaDesde).toBeNull();
    expect(resumen.fechaHasta).toBeNull();
  });

  it('un libro sin transacciones se resume en cero y sin fechas', () => {
    expect(resumirLibro(libro([]))).toMatchObject({
      cantidadTransacciones: 0,
      fechaDesde: null,
      fechaHasta: null,
    });
  });
});
