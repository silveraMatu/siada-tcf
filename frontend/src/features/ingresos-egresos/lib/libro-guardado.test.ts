import { describe, expect, it } from 'vitest';

import type { IngresosEgresosGuardado } from '../types';
import { guardadoAFilas } from './guardado-a-filas';
import { resumirIngresosEgresos } from './resumir-ingresos-egresos';

const fila = (id: number, fecha: string, extra = {}) => ({
  id,
  fila: id,
  fecha,
  concepto: `Concepto ${id}`,
  cheque: null,
  comprobante: null,
  cajaDebe: 0,
  cajaHaber: 0,
  cajaSaldo: 10,
  bancoDebe: 0,
  bancoHaber: 0,
  bancoSaldo: 20,
  egresoInc1: 0,
  egresoInc2: 0,
  egresoInc3: 0,
  egresoInc4: 0,
  egresoInc5: 0,
  ingresoMunicipal: 0,
  ingresoOtras: 0,
  cuentasVariasConcepto: null,
  cuentasVariasDebe: 0,
  cuentasVariasHaber: 0,
  ...extra,
});

const libro = (
  transacciones: IngresosEgresosGuardado['transacciones'],
): IngresosEgresosGuardado => ({
  id: 1,
  cuentaMensualId: 5,
  numeroCuentaCte: null,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  transacciones,
});

describe('resumirIngresosEgresos', () => {
  it('toma el rango de fechas por el mínimo y el máximo, no por el orden de las filas', () => {
    const resumen = resumirIngresosEgresos(
      libro([
        fila(1, '2026-03-10'),
        fila(2, '2026-03-02'),
        fila(3, '2026-03-05'),
      ]),
    );

    expect(resumen).toEqual({
      filas: 3,
      fechaDesde: '2026-03-02',
      fechaHasta: '2026-03-10',
      cargadoEl: '2026-10-15T12:00:00.000Z',
    });
  });

  it('sin filas no hay rango', () => {
    expect(resumirIngresosEgresos(libro([]))).toMatchObject({
      filas: 0,
      fechaDesde: null,
      fechaHasta: null,
    });
  });
});

describe('guardadoAFilas', () => {
  it('pasa a la forma de la vista previa: sin id, sin errores y sin textos nulos', () => {
    const [{ transaccion, errores }] = guardadoAFilas(
      libro([fila(7, '2026-03-02', { cheque: '0042' })]),
    );

    expect(errores).toEqual([]);
    expect(transaccion).not.toHaveProperty('id');
    expect(transaccion).not.toHaveProperty('comprobante');
    expect(transaccion).not.toHaveProperty('cuentasVariasConcepto');
    expect(transaccion).toMatchObject({
      fila: 7,
      cheque: '0042',
      cajaSaldo: 10,
    });
  });
});
