import { describe, expect, it } from 'vitest';

import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import {
  contarResultado,
  librosFaltantes,
  nombreDeLibroFaltante,
} from './contar-resultado';

const [fallo, verificado, faltan] = MOCK_RESULTADOS;
const banco = (cantidadTransacciones: number) => ({
  tipo: 'LIBRO_BANCO',
  cantidadTransacciones,
});

describe('librosFaltantes', () => {
  it('lee los códigos del mensaje del motor', () => {
    expect(
      librosFaltantes('Faltan libros requeridos: LIBRO_BANCO, RACI'),
    ).toEqual(['LIBRO_BANCO', 'RACI']);
  });

  it('un mensaje ausente o que no se entiende no da libros', () => {
    expect(librosFaltantes(undefined)).toEqual([]);
    expect(librosFaltantes('Algo distinto')).toEqual([]);
    expect(librosFaltantes('Faltan libros requeridos: ')).toEqual([]);
  });
});

describe('nombreDeLibroFaltante', () => {
  it('traduce el libro banco y deja el código de los que no conoce', () => {
    expect(nombreDeLibroFaltante('LIBRO_BANCO')).toBe('Libro Banco');
    expect(nombreDeLibroFaltante('RACI')).toBe('RACI');
  });
});

describe('contarResultado', () => {
  it('V3: la primera fila de cada libro es la base y las observaciones se descuentan de las verificadas', () => {
    // 10 + 5 filas → 9 + 4 evaluadas; 1 observación → 12 verificadas
    expect(contarResultado(fallo, [banco(10), banco(5)])).toEqual({
      falladas: 1,
      verificadas: 12,
      librosFaltantes: 0,
    });
  });

  it('un libro de una sola fila no tiene nada que evaluar', () => {
    expect(
      contarResultado({ ...fallo, estado: 'VERIFICADO', observaciones: [] }, [
        banco(1),
      ]),
    ).toEqual({ falladas: 0, verificadas: 0, librosFaltantes: 0 });
  });

  it('ignora los libros que V3 no recorre', () => {
    expect(
      contarResultado({ ...fallo, observaciones: [] }, [
        banco(4),
        { tipo: 'RACI', cantidadTransacciones: 100 },
      ]).verificadas,
    ).toBe(3);
  });

  it('una regla cuyo total no conocemos no inventa las verificadas', () => {
    expect(contarResultado(verificado, [banco(10)])).toEqual({
      falladas: 0,
      verificadas: null,
      librosFaltantes: 0,
    });
  });

  it('FALTAN_LIBROS cuenta libros, no filas', () => {
    expect(contarResultado(faltan, [])).toEqual({
      falladas: 0,
      verificadas: 0,
      librosFaltantes: 1,
    });
    expect(
      contarResultado(
        { ...faltan, mensaje: 'Faltan libros requeridos: RACI, RAI' },
        [],
      ).librosFaltantes,
    ).toBe(2);
  });

  it('un mensaje ilegible sigue contando al menos un libro faltante', () => {
    expect(
      contarResultado({ ...faltan, mensaje: undefined }, []).librosFaltantes,
    ).toBe(1);
  });
});
