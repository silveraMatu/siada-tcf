import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { filasARaci, parseRaciExcel, RaciParseError } from './parse-raci';

/** Fila de 17 columnas (A–Q); lo no indicado queda vacío. */
function fila(parcial: Record<number, unknown> = {}): unknown[] {
  const celdas: unknown[] = Array.from({ length: 17 }, () => null);
  for (const [indice, valor] of Object.entries(parcial)) {
    celdas[Number(indice)] = valor;
  }
  return celdas;
}

const TITULOS = fila({ 0: 'N°', 1: 'Fecha', 3: 'Expte. N°', 4: 'CONCEPTO' });
const SUBTITULOS = fila({ 0: 'As.', 6: 'Del Mes', 7: 'Acumulado' });

/** Encabezado de una partida, como en la planilla: «FECHA», presupuesto y «Partida …» con su valor. */
function partida(principal: string): unknown[][] {
  return [
    fila({
      0: 'FECHA',
      3: 'Inst. Legal',
      4: 'CONCEPTO',
      5: 'Presupuesto',
      6: 'Modificaciones',
      8: 'Total autorizado',
    }),
    fila({ 9: 'Finalidad', 12: 'Partida Principal', 14: principal }),
    fila({ 9: 'Función', 12: 'Partida Parcial', 14: '2.1' }),
  ];
}

/** Un asiento de compromiso con sus acumulados ya calculados. */
function asiento(n: number, extra: Record<number, unknown> = {}): unknown[] {
  return fila({
    0: n,
    1: '2026-03-0' + n,
    4: `Concepto ${n}`,
    6: 100,
    7: 100 * n,
    10: 0,
    11: 100 * n,
    15: 0,
    16: 0,
    ...extra,
  });
}

/** La base del bloque: solo acumulados en cero, sin asiento, fecha ni concepto. */
const BASE = fila({ 7: 0, 10: 0, 11: 0, 15: 0, 16: 0 });

function archivo(
  filas: unknown[][],
  nombre = 'raci.xlsx',
  hoja = 'Hoja1',
): File {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), hoja);
  const bookType = nombre.endsWith('.xls') ? 'biff8' : 'xlsx';
  const bytes = XLSX.write(libro, { type: 'array', bookType });
  return new File([bytes as ArrayBuffer], nombre);
}

describe('filasARaci', () => {
  it('lee los asientos de un bloque y omite la base y las filas en blanco', () => {
    const { filas, omitidas } = filasARaci([
      ...partida('2'),
      TITULOS,
      SUBTITULOS,
      BASE,
      asiento(1),
      asiento(2),
      fila(),
      fila({ 7: 0, 10: 0, 11: 0, 15: 0, 16: 0 }),
    ]);

    expect(filas.map((f) => f.transaccion.asiento)).toEqual([1, 2]);
    expect(omitidas).toBe(3);
    expect(filas.every((f) => f.errores.length === 0)).toBe(true);
    expect(filas[0].transaccion).toEqual({
      asiento: 1,
      fecha: '2026-03-01',
      concepto: 'Concepto 1',
      compromisoDelMes: 100,
      compromisoAcumulado: 100,
      devengadoDelMes: 0,
      devengadoAcumulado: 0,
      devengadoSaldo: 100,
      pagoDelMes: 0,
      pagoAcumulado: 0,
      pagoSaldoAPagar: 0,
    });
  });

  it('no asume cuántas filas tiene el bloque: pueden ser pocas o muchas', () => {
    const muchos = Array.from({ length: 40 }, (_, i) => asiento((i % 9) + 1));
    const { filas } = filasARaci([TITULOS, SUBTITULOS, BASE, ...muchos]);
    expect(filas).toHaveLength(40);

    const { filas: pocas } = filasARaci([TITULOS, SUBTITULOS, asiento(1)]);
    expect(pocas).toHaveLength(1);
  });

  it('lee cada bloque hasta el encabezado de la siguiente partida y no toma esas filas como datos', () => {
    const { filas, omitidas } = filasARaci([
      ...partida('2'),
      TITULOS,
      SUBTITULOS,
      BASE,
      asiento(1),
      fila(),
      ...partida('3'),
      TITULOS,
      SUBTITULOS,
      BASE,
      asiento(2),
      asiento(3),
    ]);

    expect(filas.map((f) => f.transaccion.asiento)).toEqual([1, 2, 3]);
    expect(filas.every((f) => f.errores.length === 0)).toBe(true);
    expect(omitidas).toBe(3);
    // la partida solo sirve para mostrar el origen: no viaja en la transacción
    expect(filas[0].partida).toBe('2 · 2.1');
    expect(filas[2].partida).toBe('3 · 2.1');
    expect(filas[0].transaccion).not.toHaveProperty('partida');
  });

  it('un concepto con el texto de un rótulo no corta el bloque', () => {
    const { filas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      asiento(1, { 4: 'Presupuesto' }),
      asiento(2, { 4: 'Finalidad' }),
      asiento(3),
    ]);
    expect(filas.map((f) => f.transaccion.concepto)).toEqual([
      'Presupuesto',
      'Finalidad',
      'Concepto 3',
    ]);
  });

  it('toma la fecha de la columna B o de la C (el título «Fecha» está combinado)', () => {
    const { filas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      asiento(1, { 1: null, 2: '2026-03-07' }),
    ]);
    expect(filas[0].transaccion.fecha).toBe('2026-03-07');
    expect(filas[0].errores).toEqual([]);
  });

  it('lee fechas de Excel (número de serie) y en formato dd/mm/aaaa', () => {
    const { filas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      asiento(1, { 1: 46083 }), // 2026-03-02
      asiento(2, { 1: '15/03/2026' }),
    ]);
    expect(filas.map((f) => f.transaccion.fecha)).toEqual([
      '2026-03-02',
      '2026-03-15',
    ]);
  });

  it('lee los textos opcionales y deja afuera los vacíos', () => {
    const { filas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      asiento(1, {
        3: ' 123/26 ',
        5: 'Decreto 5',
        8: 'OP-1',
        12: 'OPAG-9',
        13: 4567,
      }),
      asiento(2, { 3: '   ' }),
    ]);
    expect(filas[0].transaccion).toMatchObject({
      expediente: '123/26',
      compromisoInstrumentoLegal: 'Decreto 5',
      compromisoOrdenProvision: 'OP-1',
      devengadoOrdenPago: 'OPAG-9',
      pagoNumeroCheque: '4567',
    });
    expect(filas[1].transaccion).not.toHaveProperty('expediente');
    expect(filas[1].transaccion).not.toHaveProperty('pagoNumeroCheque');
  });

  it('una fila con datos de entrada pero sin asiento, fecha o concepto es un error, no se omite', () => {
    const { filas, omitidas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      fila({ 6: 500, 7: 500, 10: 0, 11: 500, 15: 0, 16: 0 }),
    ]);
    expect(omitidas).toBe(0);
    expect(filas).toHaveLength(1);
    expect(filas[0].errores).toEqual([
      'El N° de asiento es obligatorio',
      'La fecha es obligatoria',
      'El concepto es obligatorio',
    ]);
  });

  it('valida cada columna como lo hace el backend', () => {
    const { filas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      asiento(1, { 0: 1.5 }),
      asiento(2, { 1: '2026-02-31' }),
      asiento(3, { 1: 'ayer' }),
      asiento(4, { 6: -5 }),
      asiento(5, { 9: 'abc' }),
      asiento(6, { 7: null }),
      asiento(7, { 11: 'x' }),
      asiento(8, { 10: 1e15 }),
      asiento(9, { 0: 0 }),
    ]);
    expect(filas.map((f) => f.errores)).toEqual([
      ['El N° de asiento debe ser un entero positivo'],
      ['Fecha inválida: "2026-02-31"'],
      ['Fecha inválida: "ayer"'],
      ['Compromiso del mes no puede ser negativo'],
      ['Devengado del mes no es un número'],
      ['Compromiso acumulado es obligatorio'],
      ['Devengado saldo no es un número'],
      ['Devengado acumulado excede el máximo permitido'],
      ['El N° de asiento debe ser un entero positivo'],
    ]);
  });

  it('acepta acumulados y saldos negativos, y el «del mes» vacío vale 0', () => {
    const { filas } = filasARaci([
      TITULOS,
      SUBTITULOS,
      asiento(1, { 6: null, 7: -250.5, 11: -10 }),
    ]);
    expect(filas[0].errores).toEqual([]);
    expect(filas[0].transaccion.compromisoDelMes).toBe(0);
    expect(filas[0].transaccion.compromisoAcumulado).toBe(-250.5);
    expect(filas[0].transaccion.devengadoSaldo).toBe(-10);
  });

  it('la fila de cada asiento es la de la planilla (base 1)', () => {
    const { filas } = filasARaci([TITULOS, SUBTITULOS, BASE, asiento(1)]);
    expect(filas[0].fila).toBe(4);
  });

  it('sin la fila de títulos lanza un error claro', () => {
    expect(() => filasARaci([fila({ 0: 'otra cosa' })])).toThrow(
      RaciParseError,
    );
  });
});

describe('parseRaciExcel', () => {
  it('lee un .xlsx y un .xls (BIFF)', async () => {
    const datos = [...partida('2'), TITULOS, SUBTITULOS, BASE, asiento(1)];
    for (const nombre of ['raci.xlsx', 'raci.xls']) {
      const { filas } = await parseRaciExcel(archivo(datos, nombre));
      expect(filas).toHaveLength(1);
      expect(filas[0].transaccion.asiento).toBe(1);
    }
  });

  it('lee solo la primera hoja', async () => {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.aoa_to_sheet([TITULOS, SUBTITULOS, asiento(1)]),
      'Primera',
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.aoa_to_sheet([TITULOS, SUBTITULOS, asiento(2), asiento(3)]),
      'Segunda',
    );
    const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' });
    const { filas } = await parseRaciExcel(
      new File([bytes as ArrayBuffer], 'r.xlsx'),
    );
    expect(filas.map((f) => f.transaccion.asiento)).toEqual([1]);
  });

  it('si la primera hoja no tiene la estructura nombra la hoja que leyó', async () => {
    await expect(
      parseRaciExcel(archivo([['solo texto']], 'raci.xlsx', 'Mod Habilit')),
    ).rejects.toThrow(/«Mod Habilit»/);
  });

  it('una hoja con la estructura pero sin asientos lo dice', async () => {
    await expect(
      parseRaciExcel(
        archivo([...partida('2'), TITULOS, SUBTITULOS, BASE, fila()]),
      ),
    ).rejects.toThrow(/no tiene asientos cargados/);
  });

  it('un archivo ilegible lanza RaciParseError', async () => {
    await expect(
      parseRaciExcel(new File([new Uint8Array(0)], 'raci.xlsx')),
    ).rejects.toBeInstanceOf(RaciParseError);
  });
});
