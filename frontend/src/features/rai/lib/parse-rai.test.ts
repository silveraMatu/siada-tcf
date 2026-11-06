import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { filasARai, parseRaiExcel, RaiParseError } from './parse-rai';

/** Fila de 9 columnas (A–I); lo no indicado queda vacío. */
function fila(parcial: Record<number, unknown> = {}): unknown[] {
  const celdas: unknown[] = Array.from({ length: 9 }, () => null);
  for (const [indice, valor] of Object.entries(parcial)) {
    celdas[Number(indice)] = valor;
  }
  return celdas;
}

/** Encabezado de la planilla real: título, ejercicio, partida y total autorizado (nada de esto se envía). */
const ENCABEZADO = [
  fila({ 4: 'COMISION DE FOMENTO DE SIETE PALMAS ' }),
  fila(),
  fila({ 4: 'REGISTRO ANALÍTICO DE INGRESOS', 7: 'EJERCICIO FISCAL 2025' }),
  fila({ 0: 'FECHA', 3: 'Inst. Legal', 4: 'CONCEPTO', 6: 'Total autorizado' }),
  fila({
    0: 15,
    1: 11,
    2: 24,
    3: 'Orden 326',
    6: 754_800_000,
    7: 'PARTIDA: Coparticipacion ',
  }),
  fila(),
];
const TITULOS = fila({
  0: 'Asto. N°',
  1: 'Fecha',
  3: 'Planilla Nº',
  4: 'CONCEPTO',
  5: 'INGRESOS DIARIOS ',
  6: 'INGRESOS MENSUALES',
  7: 'INGRESOS ACUMULADOS',
  8: 'SALDOS',
});
/** La segunda fila de títulos (celdas combinadas) llega vacía. */
const CONTINUACION = fila();
const TRANSPORTE = fila({ 4: 'transporte ', 7: 490_300_000, 8: 264_500_000 });

/** Fila sin usar: nada que cargar, pero las fórmulas de G a I arrastran el último valor. */
const SIN_USAR = fila({ 6: 60_895_890, 7: 551_195_890, 8: 203_604_110 });

/** Un asiento como los de la planilla real: día y mes en dos celdas, sin N° de asiento ni año. */
function asiento(
  dia: number,
  mes: number,
  concepto: string,
  diario: number | null,
  acumulados: [number, number, number],
  extra: Record<number, unknown> = {},
): unknown[] {
  return fila({
    1: dia,
    2: mes,
    4: concepto,
    5: diario,
    6: acumulados[0],
    7: acumulados[1],
    8: acumulados[2],
    ...extra,
  });
}

const PRIMERO = asiento(
  1,
  9,
  'Saldo Coparticipacion agosto/25',
  48_895_890,
  [48_895_890, 539_195_890, 215_604_110],
);
const SEGUNDO = asiento(
  29,
  9,
  'anticipo Coparticipacion sept/25',
  12_000_000,
  [60_895_890, 551_195_890, 203_604_110],
);

const hoja = (...datos: unknown[][]) => [
  ...ENCABEZADO,
  TITULOS,
  CONTINUACION,
  TRANSPORTE,
  ...datos,
];

function archivo(
  filas: unknown[][],
  nombre = 'rai.xlsx',
  nombreHoja = 'RAI',
): File {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.aoa_to_sheet(filas),
    nombreHoja,
  );
  const bookType = nombre.endsWith('.xls') ? 'biff8' : 'xlsx';
  const bytes = XLSX.write(libro, { type: 'array', bookType });
  return new File([bytes as ArrayBuffer], nombre);
}

describe('filasARai', () => {
  it('lee los asientos de la planilla real y arma la fecha con el ejercicio de la rendición', () => {
    const { filas } = filasARai(hoja(PRIMERO, SEGUNDO, SIN_USAR), 2026);

    expect(filas.map((f) => f.errores)).toEqual([[], []]);
    expect(filas[0].transaccion).toEqual({
      fecha: '2026-09-01',
      concepto: 'Saldo Coparticipacion agosto/25',
      ingresosDiarios: 48_895_890,
      ingresosMensuales: 48_895_890,
      ingresosAcumulados: 539_195_890,
      saldo: 215_604_110,
    });
    expect(filas[1].transaccion.fecha).toBe('2026-09-29');
  });

  it('no inventa el N° de asiento: sin él no viaja, y con él se respeta', () => {
    const { filas } = filasARai(
      hoja(PRIMERO, asiento(2, 9, 'Con número', 1, [1, 1, 1], { 0: 7 })),
      2026,
    );
    expect(filas[0].transaccion).not.toHaveProperty('asiento');
    expect(filas[1].transaccion.asiento).toBe(7);
  });

  it('omite y cuenta el transporte y las filas sin usar aunque sus fórmulas arrastren valores', () => {
    const { filas, omitidas } = filasARai(
      hoja(PRIMERO, SIN_USAR, SIN_USAR, fila(), SEGUNDO, SIN_USAR),
      2026,
    );
    expect(filas).toHaveLength(2);
    // transporte + 3 filas con fórmulas + 1 totalmente en blanco
    expect(omitidas).toBe(5);
    expect(filas.some((f) => f.errores.length > 0)).toBe(false);
  });

  it('la fila de continuación de los títulos combinados no cuenta como omitida', () => {
    const { omitidas } = filasARai(hoja(PRIMERO), 2026);
    expect(omitidas).toBe(1); // solo el transporte
  });

  it('un asiento con fecha y concepto pero sin importe del día vale 0 y es válido', () => {
    const { filas } = filasARai(
      hoja(
        asiento(30, 9, 'Venta activo fijo', null, [0, 5_000_000, 55_000_000], {
          3: 166,
        }),
      ),
      2026,
    );
    expect(filas[0].errores).toEqual([]);
    expect(filas[0].transaccion).toMatchObject({
      ingresosDiarios: 0,
      planillaNumero: '166',
      fecha: '2026-09-30',
    });
  });

  it('lee el ejercicio del encabezado solo para poder avisar', () => {
    expect(filasARai(hoja(PRIMERO), 2026).ejercicioDeLaPlanilla).toBe(2025);
    expect(
      filasARai([TITULOS, CONTINUACION, PRIMERO], 2026).ejercicioDeLaPlanilla,
    ).toBeUndefined();
  });

  it('no toma la partida ni el total autorizado del encabezado como asientos', () => {
    const { filas } = filasARai(hoja(PRIMERO), 2026);
    expect(filas).toHaveLength(1);
    const json = JSON.stringify(filas);
    expect(json).not.toContain('PARTIDA');
    expect(json).not.toContain('754800000');
  });

  it('valida el día y el mes', () => {
    const { filas } = filasARai(
      hoja(
        asiento(31, 2, 'Fecha imposible', 1, [1, 1, 1]),
        asiento(5, 13, 'Mes 13', 1, [1, 1, 1]),
        asiento(1.5, 9, 'Día con decimales', 1, [1, 1, 1]),
        fila({ 4: 'Sin día ni mes', 5: 10, 6: 10, 7: 10, 8: 10 }),
        asiento(5, 9, 'Sin mes', 1, [1, 1, 1], { 2: null }),
      ),
      2026,
    );
    expect(filas.map((f) => f.errores)).toEqual([
      ['Fecha inválida: 31/02'],
      ['Fecha inválida: 05/13'],
      ['El día y el mes deben ser números enteros'],
      ['El día es obligatorio', 'El mes es obligatorio'],
      ['El mes es obligatorio'],
    ]);
  });

  it('el 29 de febrero depende del ejercicio de la rendición', () => {
    const feb29 = asiento(29, 2, 'Bisiesto', 1, [1, 1, 1]);
    expect(filasARai(hoja(feb29), 2028).filas[0].errores).toEqual([]);
    expect(filasARai(hoja(feb29), 2026).filas[0].errores).toEqual([
      'Fecha inválida: 29/02',
    ]);
  });

  it('una fila con datos pero sin concepto es un error, no se omite', () => {
    const { filas, omitidas } = filasARai(
      hoja(asiento(5, 9, '', 100, [100, 100, 100])),
      2026,
    );
    expect(omitidas).toBe(1);
    expect(filas[0].errores).toEqual(['El concepto es obligatorio']);
  });

  it('valida los importes como el backend', () => {
    const { filas } = filasARai(
      hoja(
        asiento(1, 9, 'Diario negativo', -5, [1, 1, 1]),
        asiento(2, 9, 'Diario texto', 'abc' as unknown as number, [1, 1, 1]),
        asiento(3, 9, 'Sin mensual', 1, [1, 1, 1], { 6: null }),
        asiento(4, 9, 'Acumulado texto', 1, [1, 1, 1], { 7: 'x' }),
        asiento(5, 9, 'Saldo enorme', 1, [1, 1, 1], { 8: 1e15 }),
        asiento(6, 9, 'Con signo', 1, [-5, -10, -15]),
      ),
      2026,
    );
    expect(filas.map((f) => f.errores)).toEqual([
      ['Ingresos diarios no puede ser negativo'],
      ['Ingresos diarios no es un número'],
      ['Ingresos mensuales es obligatorio'],
      ['Ingresos acumulados no es un número'],
      ['Saldo excede el máximo permitido'],
      [],
    ]);
  });

  it('un N° de asiento que viene debe ser un entero positivo', () => {
    const { filas } = filasARai(
      hoja(
        asiento(1, 9, 'Cero', 1, [1, 1, 1], { 0: 0 }),
        asiento(2, 9, 'Decimal', 1, [1, 1, 1], { 0: 1.5 }),
      ),
      2026,
    );
    expect(filas.map((f) => f.errores)).toEqual([
      ['El N° de asiento debe ser un entero positivo'],
      ['El N° de asiento debe ser un entero positivo'],
    ]);
  });

  it('la fila de cada asiento es la de la planilla (base 1)', () => {
    const { filas } = filasARai(hoja(PRIMERO), 2026);
    expect(filas[0].fila).toBe(ENCABEZADO.length + 4);
  });

  it('sin la fila de títulos lanza un error claro', () => {
    expect(() => filasARai([fila({ 0: 'otra cosa' })], 2026)).toThrow(
      RaiParseError,
    );
  });
});

describe('parseRaiExcel', () => {
  it('lee un .xlsx y un .xls (BIFF) con el ejercicio de la rendición', async () => {
    const datos = hoja(PRIMERO, SEGUNDO, SIN_USAR);
    for (const nombre of ['rai.xlsx', 'rai.xls']) {
      const { filas, ejercicioDeLaPlanilla } = await parseRaiExcel(
        archivo(datos, nombre),
        2026,
      );
      expect(filas.map((f) => f.transaccion.fecha)).toEqual([
        '2026-09-01',
        '2026-09-29',
      ]);
      expect(ejercicioDeLaPlanilla).toBe(2025);
    }
  });

  it('lee solo la primera hoja', async () => {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.aoa_to_sheet(hoja(PRIMERO)),
      'RAI',
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.aoa_to_sheet(hoja(SEGUNDO)),
      'RAI Coparticip',
    );
    const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' });
    const { filas } = await parseRaiExcel(
      new File([bytes as ArrayBuffer], 'r.xlsx'),
      2026,
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].transaccion.concepto).toMatch(/Saldo Coparticipacion/);
  });

  it('si la primera hoja no tiene la estructura nombra la hoja que leyó', async () => {
    await expect(
      parseRaiExcel(
        archivo([['solo texto']], 'rai.xlsx', 'modelo habilitar'),
        2026,
      ),
    ).rejects.toThrow(/«modelo habilitar»/);
  });

  it('una hoja con la estructura pero sin asientos lo dice', async () => {
    await expect(
      parseRaiExcel(archivo(hoja(SIN_USAR, SIN_USAR)), 2026),
    ).rejects.toThrow(/no tiene asientos cargados/);
  });

  it('un archivo ilegible lanza RaiParseError', async () => {
    await expect(
      parseRaiExcel(new File([new Uint8Array(0)], 'rai.xlsx'), 2026),
    ).rejects.toBeInstanceOf(RaiParseError);
  });
});
