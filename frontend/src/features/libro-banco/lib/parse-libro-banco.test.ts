import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { LibroBancoParseError, parseLibroBanco } from './parse-libro-banco';

function xlsxBuffer(filas: unknown[][]): ArrayBuffer {
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Libro');
  return XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function csvBuffer(texto: string): ArrayBuffer {
  return new TextEncoder().encode(texto).buffer as ArrayBuffer;
}

const ENCABEZADO = [
  'FECHA',
  'CHEQUE',
  'A LA ORDEN DE',
  'DEPOSITOS',
  'RETIRO',
  'SALDO',
];

describe('parseLibroBanco', () => {
  it('extrae la cuenta y las transacciones tras el encabezado institucional', () => {
    const resultado = parseLibroBanco(
      xlsxBuffer([
        ['TRIBUNAL DE CUENTAS'],
        ['LIBRO BANCO - Cta.Cte. N° 000123/4'],
        [],
        ENCABEZADO,
        [null, null, 'SALDO ANTERIOR', null, null, 10000],
        ['02/03/2026', '0001', 'Proveedor SA', null, 1500.5, 8499.5],
        ['03/03/2026', null, 'Cliente', 2000, null, 10499.5],
      ]),
    );

    expect(resultado.numeroCuentaCte).toBe('000123/4');
    expect(resultado.filas.map((f) => f.transaccion)).toEqual([
      { aLaOrdenDe: 'SALDO ANTERIOR', depositos: 0, retiro: 0, saldo: 10000 },
      {
        fecha: '2026-03-02',
        cheque: '0001',
        aLaOrdenDe: 'Proveedor SA',
        depositos: 0,
        retiro: 1500.5,
        saldo: 8499.5,
      },
      {
        fecha: '2026-03-03',
        aLaOrdenDe: 'Cliente',
        depositos: 2000,
        retiro: 0,
        saldo: 10499.5,
      },
    ]);
    expect(resultado.filas.every((f) => f.errores.length === 0)).toBe(true);
  });

  it('toma el número de Cta. Cte. de la celda contigua', () => {
    const resultado = parseLibroBanco(
      xlsxBuffer([
        ['Cta. Cte. N°', '555-1/9'],
        ENCABEZADO,
        [null, null, 'SALDO ANTERIOR', null, null, 1],
      ]),
    );
    expect(resultado.numeroCuentaCte).toBe('555-1/9');
  });

  it('detecta el encabezado ignorando mayúsculas y acentos', () => {
    const resultado = parseLibroBanco(
      xlsxBuffer([
        ['Fecha', 'Cheque', 'A la orden de', 'Depósitos', 'Retiro', 'Saldo'],
        [null, null, 'X', 5, null, 5],
      ]),
    );
    expect(resultado.filas).toHaveLength(1);
    expect(resultado.numeroCuentaCte).toBeUndefined();
  });

  it('convierte fechas seriales de Excel a ISO', () => {
    const resultado = parseLibroBanco(
      xlsxBuffer([ENCABEZADO, [46083, null, 'X', null, null, 1]]),
    );
    // 46083 = 2026-03-02
    expect(resultado.filas[0].transaccion.fecha).toBe('2026-03-02');
  });

  it('tolera números en formato es-AR dentro de un CSV', () => {
    const resultado = parseLibroBanco(
      csvBuffer(
        [
          'Cta.Cte. 9999/1',
          'FECHA,CHEQUE,A LA ORDEN DE,DEPOSITOS,RETIRO,SALDO',
          '05/03/2026,,"Pago, SA","1.234,50",,"-2.000.000,25"',
        ].join('\n'),
      ),
    );
    expect(resultado.numeroCuentaCte).toBe('9999/1');
    expect(resultado.filas[0].transaccion).toEqual({
      fecha: '2026-03-05',
      aLaOrdenDe: 'Pago, SA',
      depositos: 1234.5,
      retiro: 0,
      saldo: -2000000.25,
    });
  });

  it('lee CSV separado por punto y coma', () => {
    const resultado = parseLibroBanco(
      csvBuffer(
        [
          'FECHA;CHEQUE;A LA ORDEN DE;DEPOSITOS;RETIRO;SALDO',
          '05/03/2026;;Pago;100;;100',
        ].join('\n'),
      ),
    );
    expect(resultado.filas[0].transaccion.aLaOrdenDe).toBe('Pago');
  });

  it('marca las filas inválidas en lugar de inventar valores', () => {
    const resultado = parseLibroBanco(
      xlsxBuffer([
        ENCABEZADO,
        [null, null, '', -5, null, 'abc'],
        [null, null, 'OK', 1, null, 1e15],
      ]),
    );
    const [mala, desbordada] = resultado.filas;
    expect(mala.errores).toEqual([
      '"A la orden de" es obligatorio',
      'Depósitos no puede ser negativo',
      'Saldo no es un número',
    ]);
    expect(desbordada.errores).toEqual(['Saldo excede el máximo permitido']);
  });

  it('se detiene en la primera fila vacía (ignora totales posteriores)', () => {
    const resultado = parseLibroBanco(
      xlsxBuffer([
        ENCABEZADO,
        [null, null, 'A', 1, null, 1],
        [],
        ['TOTALES', null, null, 1, 0, 1],
      ]),
    );
    expect(resultado.filas).toHaveLength(1);
  });

  it('falla con un mensaje claro si no hay encabezado', () => {
    expect(() => parseLibroBanco(xlsxBuffer([['hola'], [1, 2, 3]]))).toThrow(
      LibroBancoParseError,
    );
  });

  it('falla si no hay transacciones bajo el encabezado', () => {
    expect(() => parseLibroBanco(xlsxBuffer([ENCABEZADO]))).toThrow(
      /no contiene transacciones/,
    );
  });
});
