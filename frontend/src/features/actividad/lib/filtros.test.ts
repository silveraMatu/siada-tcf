import { describe, expect, it } from 'vitest';

import { aFiltros, contarFiltros, FORMULARIO_VACIO } from './filtros';

const con = (parcial: Partial<typeof FORMULARIO_VACIO>) => ({
  ...FORMULARIO_VACIO,
  ...parcial,
});

describe('aFiltros', () => {
  it('un formulario vacío no filtra nada', () => {
    expect(aFiltros(FORMULARIO_VACIO)).toEqual({ filtros: {} });
  });

  it('solo incluye lo que se completó', () => {
    expect(
      aFiltros(
        con({ accion: 'LOGIN', resultado: 'FALLO', organismoId: ' 7 ' }),
      ),
    ).toEqual({
      filtros: { accion: 'LOGIN', resultado: 'FALLO', organismoId: 7 },
    });
  });

  it('el DNI se limpia de puntos y guiones y debe tener 7 u 8 dígitos', () => {
    expect(aFiltros(con({ dni: '30.123.456' }))).toEqual({
      filtros: { dni: '30123456' },
    });
    expect(aFiltros(con({ dni: '123' })).error).toBe(
      'El DNI debe tener 7 u 8 dígitos',
    );
  });

  it('las fechas locales pasan a ISO con offset', () => {
    const { filtros } = aFiltros(
      con({ desde: '2026-03-02T08:30', hasta: '2026-03-03T18:00' }),
    );

    expect(filtros?.desde).toBe(new Date('2026-03-02T08:30').toISOString());
    expect(filtros?.hasta).toBe(new Date('2026-03-03T18:00').toISOString());
  });

  it('«Desde» posterior a «Hasta» es un error', () => {
    expect(
      aFiltros(con({ desde: '2026-03-04T00:00', hasta: '2026-03-03T00:00' }))
        .error,
    ).toMatch(/no puede ser posterior/);
  });

  it.each([['abc'], ['0'], ['-3'], ['1.5']])(
    'un id inválido (%s) se rechaza',
    (valor) => {
      expect(aFiltros(con({ usuarioId: valor })).error).toMatch(
        /número entero positivo/,
      );
    },
  );
});

describe('contarFiltros', () => {
  it('cuenta los filtros activos', () => {
    expect(contarFiltros({})).toBe(0);
    expect(contarFiltros({ dni: '30123456', accion: 'LOGIN' })).toBe(2);
  });
});
