import { describe, expect, it } from 'vitest';

import {
  describirLibrosCargados,
  describirRangoFechas,
  describirTransacciones,
  formatearFecha,
} from './formato-libro';

describe('formatearFecha', () => {
  it('pasa una fecha ISO a día/mes/año', () => {
    expect(formatearFecha('2026-03-28')).toBe('28/03/2026');
  });

  it('deja como están los textos que no son una fecha ISO', () => {
    expect(formatearFecha('28/03/2026')).toBe('28/03/2026');
    expect(formatearFecha('marzo')).toBe('marzo');
  });
});

describe('describirRangoFechas', () => {
  it('muestra desde y hasta', () => {
    expect(describirRangoFechas('2026-03-01', '2026-03-28')).toBe(
      '01/03/2026 al 28/03/2026',
    );
  });

  it('muestra una sola fecha si coinciden', () => {
    expect(describirRangoFechas('2026-04-02', '2026-04-02')).toBe('02/04/2026');
  });

  it('muestra la fecha que haya si falta una de las dos', () => {
    expect(describirRangoFechas('2026-04-02', null)).toBe('02/04/2026');
    expect(describirRangoFechas(null, '2026-04-02')).toBe('02/04/2026');
  });

  it('avisa si ninguna transacción trae fecha', () => {
    expect(describirRangoFechas(null, null)).toBe('Sin fechas');
  });
});

describe('plurales', () => {
  it.each([
    [0, '0 transacciones'],
    [1, '1 transacción'],
    [12, '12 transacciones'],
  ])('%i → %s', (cantidad, texto) => {
    expect(describirTransacciones(cantidad)).toBe(texto);
  });

  it.each([
    [0, '0 libros cargados'],
    [1, '1 libro cargado'],
    [3, '3 libros cargados'],
  ])('%i → %s', (cantidad, texto) => {
    expect(describirLibrosCargados(cantidad)).toBe(texto);
  });
});
