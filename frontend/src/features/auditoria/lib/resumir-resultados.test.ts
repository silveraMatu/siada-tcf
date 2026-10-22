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
      observaciones: 1,
    });
  });

  it('sin resultados todo es cero', () => {
    expect(resumirResultados([])).toEqual({
      verificadas: 0,
      fallidas: 0,
      omitidas: 0,
      observaciones: 0,
    });
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
