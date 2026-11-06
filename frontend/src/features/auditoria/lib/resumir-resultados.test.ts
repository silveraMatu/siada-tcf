import { describe, expect, it } from 'vitest';

import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import {
  filtrarPorEstado,
  ordenarPorCodigo,
  resumirResultados,
} from './resumir-resultados';

describe('resumirResultados', () => {
  it('cuenta reglas por estado y las observaciones de las fallidas', () => {
    expect(resumirResultados(MOCK_RESULTADOS)).toEqual({
      verificadas: 1,
      fallidas: 1,
      omitidas: 1,
      noAplican: 0,
      observaciones: 1,
    });
  });

  it('sin resultados todo es cero', () => {
    expect(resumirResultados([])).toEqual({
      verificadas: 0,
      fallidas: 0,
      omitidas: 0,
      noAplican: 0,
      observaciones: 0,
    });
  });
});

describe('reglas que no aplican por falta del RACI (opcional)', () => {
  const [, , faltan] = MOCK_RESULTADOS;
  const noAplica = { ...faltan, codigoRegla: 'P1', librosFaltantes: ['RACI'] };

  it('no se cuentan como omitidas: se cuentan aparte', () => {
    expect(resumirResultados([...MOCK_RESULTADOS, noAplica])).toMatchObject({
      omitidas: 1,
      noAplican: 1,
    });
  });

  it('con el RAI pasa lo mismo que con el RACI', () => {
    const sinRai = { ...noAplica, codigoRegla: 'V7', librosFaltantes: ['RAI'] };
    expect(resumirResultados([sinRai, noAplica])).toMatchObject({
      noAplican: 2,
      omitidas: 0,
    });
  });

  it('el filtro de omitidas no las incluye, igual que su tarjeta', () => {
    const todas = [...MOCK_RESULTADOS, noAplica];
    expect(
      filtrarPorEstado(todas, 'FALTAN_LIBROS').map((r) => r.codigoRegla),
    ).toEqual([faltan.codigoRegla]);
    expect(filtrarPorEstado(todas, null)).toHaveLength(4);
  });
});

describe('ordenarPorCodigo', () => {
  it('ordena por número, no por texto (V2 antes que V10), sin tocar el original', () => {
    const base = MOCK_RESULTADOS[0];
    const desordenadas = [
      { ...base, codigoRegla: 'V10' },
      { ...base, codigoRegla: 'V2' },
      { ...base, codigoRegla: 'V3' },
    ];

    expect(ordenarPorCodigo(desordenadas).map((r) => r.codigoRegla)).toEqual([
      'V2',
      'V3',
      'V10',
    ]);
    expect(desordenadas[0].codigoRegla).toBe('V10');
  });
});

describe('filtrarPorEstado', () => {
  it('sin estado devuelve todas y con estado solo las de ese estado', () => {
    expect(filtrarPorEstado(MOCK_RESULTADOS, null)).toHaveLength(3);
    expect(
      filtrarPorEstado(MOCK_RESULTADOS, 'FALLO').map((r) => r.codigoRegla),
    ).toEqual(['V3']);
  });
});
