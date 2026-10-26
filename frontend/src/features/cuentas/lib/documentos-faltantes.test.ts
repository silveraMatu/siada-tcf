import { describe, expect, it } from 'vitest';

import { documentosFaltantes } from './documentos-faltantes';

describe('documentosFaltantes', () => {
  it('sin nada cargado faltan los dos, en el orden en que se muestran', () => {
    expect(
      documentosFaltantes({ librosBanco: 0, ingresosEgresos: false }),
    ).toEqual(['Libro Banco', 'Ingresos y Egresos']);
  });

  it('con libros banco pero sin Ingresos y Egresos falta solo ese', () => {
    expect(
      documentosFaltantes({ librosBanco: 2, ingresosEgresos: false }),
    ).toEqual(['Ingresos y Egresos']);
  });

  it('con Ingresos y Egresos pero sin libro banco falta solo el banco', () => {
    expect(
      documentosFaltantes({ librosBanco: 0, ingresosEgresos: true }),
    ).toEqual(['Libro Banco']);
  });

  it('con los dos cargados no falta nada', () => {
    expect(
      documentosFaltantes({ librosBanco: 1, ingresosEgresos: true }),
    ).toEqual([]);
  });
});
