import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import {
  filasATransacciones,
  IngresosEgresosParseError,
  limpiarMonto,
  parseIngresosEgresosExcel,
} from './parse-ingresos-egresos';

const CABECERAS = [
  ['MUNICIPALIDAD'],
  ['LIBRO DE INGRESOS Y EGRESOS'],
  ['FECHA', 'CONCEPTO', 'CHEQUE', 'COMPROB.'],
];

/** Fila de 20 columnas; lo no indicado queda vacío. */
function fila(parcial: Record<number, unknown> = {}): unknown[] {
  const celdas: unknown[] = Array.from({ length: 20 }, () => null);
  for (const [indice, valor] of Object.entries(parcial)) {
    celdas[Number(indice)] = valor;
  }
  return celdas;
}

function archivo(filas: unknown[][], nombre = 'ie.xlsx'): File {
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Hoja1');
  const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' });
  return new File([bytes as ArrayBuffer], nombre);
}

describe('limpiarMonto', () => {
  it('trata la celda vacía o nula como 0', () => {
    expect(limpiarMonto(null)).toBe(0);
    expect(limpiarMonto(undefined)).toBe(0);
    expect(limpiarMonto('  ')).toBe(0);
  });

  it('lee números y formato es-AR, y devuelve NaN si no es un número', () => {
    expect(limpiarMonto(12.5)).toBe(12.5);
    expect(limpiarMonto('1.234,56')).toBe(1234.56);
    expect(limpiarMonto('abc')).toBeNaN();
  });
});

describe('filasATransacciones', () => {
  it('mapea las 20 columnas por su posición y numera desde la fila 4', () => {
    const [resultado] = filasATransacciones([
      fila({
        0: '2026-03-02',
        1: 'Cobro de tasas',
        2: '0001',
        3: 'C-15',
        4: 100,
        5: 20,
        6: 80,
        7: 300,
        8: 50,
        9: 250,
        10: 1,
        11: 2,
        12: 3,
        13: 4,
        14: 5,
        15: 600,
        16: 700,
        17: 'Fondo de terceros',
        18: 8,
        19: 9,
      }),
    ]);

    expect(resultado.errores).toEqual([]);
    expect(resultado.transaccion).toEqual({
      fila: 4,
      fecha: '2026-03-02',
      concepto: 'Cobro de tasas',
      cheque: '0001',
      comprobante: 'C-15',
      cajaDebe: 100,
      cajaHaber: 20,
      cajaSaldo: 80,
      bancoDebe: 300,
      bancoHaber: 50,
      bancoSaldo: 250,
      egresoInc1: 1,
      egresoInc2: 2,
      egresoInc3: 3,
      egresoInc4: 4,
      egresoInc5: 5,
      ingresoMunicipal: 600,
      ingresoOtras: 700,
      cuentasVariasConcepto: 'Fondo de terceros',
      cuentasVariasDebe: 8,
      cuentasVariasHaber: 9,
    });
  });

  it('omite los textos opcionales vacíos y toma los montos vacíos como 0', () => {
    const [{ transaccion, errores }] = filasATransacciones([
      fila({ 0: '2026-03-02', 1: 'Saldo inicial', 6: 10, 9: 20 }),
    ]);

    expect(errores).toEqual([]);
    expect(transaccion).not.toHaveProperty('cheque');
    expect(transaccion).not.toHaveProperty('comprobante');
    expect(transaccion).not.toHaveProperty('cuentasVariasConcepto');
    expect(transaccion.cajaDebe).toBe(0);
    expect(transaccion.egresoInc5).toBe(0);
    expect(transaccion.cuentasVariasHaber).toBe(0);
  });

  it('convierte fechas seriales de Excel y dd/mm/aaaa a YYYY-MM-DD', () => {
    const filas = filasATransacciones([
      fila({ 0: 46083, 1: 'A' }), // 02/03/2026
      fila({ 0: '05/03/2026', 1: 'B' }),
    ]);

    expect(filas.map((f) => f.transaccion.fecha)).toEqual([
      '2026-03-02',
      '2026-03-05',
    ]);
  });

  it('ignora las filas totalmente vacías pero conserva la numeración', () => {
    const filas = filasATransacciones([
      fila({ 0: '2026-03-02', 1: 'A' }),
      fila(),
      fila({ 0: '2026-03-03', 1: 'B' }),
    ]);

    expect(filas.map((f) => f.transaccion.fila)).toEqual([4, 6]);
  });

  it('marca los errores de la fila sin descartarla', () => {
    const [{ errores }] = filasATransacciones([
      fila({
        0: 'no es fecha 99/99/9999',
        4: -5,
        6: -10,
        7: 'abc',
        15: 1_000_000_000_000,
      }),
    ]);

    expect(errores).toEqual(
      expect.arrayContaining([
        'El concepto es obligatorio',
        'Caja debe no puede ser negativo',
        'Banco debe no es un número',
        'Ingreso municipal excede el máximo permitido',
      ]),
    );
    // un saldo sí puede ser negativo
    expect(errores).not.toContain('Caja saldo no puede ser negativo');
  });

  it('exige la fecha', () => {
    const [{ errores }] = filasATransacciones([fila({ 1: 'Sin fecha' })]);

    expect(errores).toContain('La fecha es obligatoria');
  });
});

describe('parseIngresosEgresosExcel', () => {
  it('descarta las 3 filas de encabezado y lee desde la fila 4', async () => {
    const { filas } = await parseIngresosEgresosExcel(
      archivo([
        ...CABECERAS,
        fila({ 0: '2026-03-02', 1: 'Primero', 6: 100, 9: 200 }),
        fila({ 0: '2026-03-03', 1: 'Segundo', 6: 90, 9: 210 }),
      ]),
    );

    expect(filas).toHaveLength(2);
    expect(filas[0].transaccion).toMatchObject({
      fila: 4,
      concepto: 'Primero',
      cajaSaldo: 100,
      bancoSaldo: 200,
    });
    expect(filas[1].transaccion.fila).toBe(5);
  });

  it('lanza si el archivo no tiene filas de datos', async () => {
    await expect(
      parseIngresosEgresosExcel(archivo(CABECERAS)),
    ).rejects.toBeInstanceOf(IngresosEgresosParseError);
  });
});
