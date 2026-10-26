import { describe, expect, it } from 'vitest';

import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import { contarResultado, nombreDeLibroFaltante } from './contar-resultado';

const [fallo, verificado, faltan] = MOCK_RESULTADOS;

describe('nombreDeLibroFaltante', () => {
  it('traduce los libros que conoce y deja el código de los que no', () => {
    expect(nombreDeLibroFaltante('LIBRO_BANCO')).toBe('Libro Banco');
    expect(nombreDeLibroFaltante('INGRESOS_EGRESOS')).toBe(
      'Ingresos y Egresos',
    );
    expect(nombreDeLibroFaltante('RACI')).toBe('RACI');
  });
});

describe('contarResultado', () => {
  it('descuenta las observaciones de los controles que informó el motor', () => {
    // 9 controles, 1 con observación → 8 sin diferencias
    expect(contarResultado(fallo)).toEqual({
      falladas: 1,
      verificadas: 8,
      librosFaltantes: 0,
    });
  });

  it('una regla verificada cuenta todos sus controles como verificados', () => {
    expect(contarResultado(verificado)).toEqual({
      falladas: 0,
      verificadas: 4,
      librosFaltantes: 0,
    });
  });

  it('un cruce entre libros es un único control', () => {
    expect(
      contarResultado({ ...verificado, filasEvaluadas: 1 }).verificadas,
    ).toBe(1);
    expect(contarResultado({ ...fallo, filasEvaluadas: 1 })).toEqual({
      falladas: 1,
      verificadas: 0,
      librosFaltantes: 0,
    });
  });

  it('nunca da verificadas negativas si el motor informa menos controles que observaciones', () => {
    expect(contarResultado({ ...fallo, filasEvaluadas: 0 }).verificadas).toBe(
      0,
    );
  });

  it('sin el total del motor no inventa las verificadas', () => {
    expect(
      contarResultado({ ...verificado, filasEvaluadas: null }).verificadas,
    ).toBeNull();
  });

  it('FALTAN_LIBROS cuenta los libros que informa el motor, no controles', () => {
    expect(contarResultado(faltan)).toEqual({
      falladas: 0,
      verificadas: 0,
      librosFaltantes: 1,
    });
    expect(
      contarResultado({
        ...faltan,
        librosFaltantes: ['LIBRO_BANCO', 'INGRESOS_EGRESOS'],
      }).librosFaltantes,
    ).toBe(2);
  });

  it('un estado omitido sin lista de libros sigue contando al menos uno', () => {
    expect(
      contarResultado({ ...faltan, librosFaltantes: [] }).librosFaltantes,
    ).toBe(1);
  });
});
