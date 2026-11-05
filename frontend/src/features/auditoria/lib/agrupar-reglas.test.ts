import { describe, expect, it } from 'vitest';

import type { ResultadoValidacion } from '../types/auditoria.types';
import { agruparPorTipo } from './agrupar-reglas';

const regla = (
  codigoRegla: string,
  estado: ResultadoValidacion['estado'] = 'VERIFICADO',
  librosFaltantes: string[] = [],
): ResultadoValidacion => ({
  codigoRegla,
  descripcion: codigoRegla,
  estado,
  observaciones: [],
  filasEvaluadas: estado === 'VERIFICADO' ? 1 : null,
  librosFaltantes,
});

// el orden en que responde el backend
const CATORCE = [
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'C1',
  'C2',
  'C4',
  'C5',
  'C6',
  'P1',
  'P2',
  'F1',
].map((c) => regla(c));

describe('agruparPorTipo', () => {
  it('reparte las 14 reglas en V, C, P y F, en ese orden', () => {
    const grupos = agruparPorTipo([...CATORCE].reverse());

    expect(
      grupos.map((g) => [g.titulo, g.resultados.map((r) => r.codigoRegla)]),
    ).toEqual([
      ['Validaciones internas', ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']],
      ['Cruces entre libros', ['C1', 'C2', 'C4', 'C5', 'C6']],
      ['Integridad de cheques', ['P1', 'P2']],
      ['Coherencia de fechas', ['F1']],
    ]);
  });

  it('ordena por número dentro del grupo (V2 antes que V10)', () => {
    const [grupo] = agruparPorTipo([regla('V10'), regla('V2'), regla('V1')]);
    expect(grupo.resultados.map((r) => r.codigoRegla)).toEqual([
      'V1',
      'V2',
      'V10',
    ]);
  });

  it('no devuelve grupos vacíos', () => {
    expect(agruparPorTipo([regla('F1')]).map((g) => g.clave)).toEqual(['F']);
    expect(agruparPorTipo([])).toEqual([]);
  });

  it('un código con otra letra va a «Otras reglas» sin perderse', () => {
    const grupos = agruparPorTipo([regla('V1'), regla('S1')]);
    expect(grupos.map((g) => g.titulo)).toEqual([
      'Validaciones internas',
      'Otras reglas',
    ]);
  });

  it('cada grupo trae su propio resumen, con las reglas que no aplican por falta del RACI', () => {
    const grupos = agruparPorTipo([
      regla('P1', 'FALTAN_LIBROS', ['RACI']),
      regla('P2', 'FALTAN_LIBROS', ['RACI']),
      regla('C1', 'FALTAN_LIBROS', ['RACI', 'INGRESOS_EGRESOS']),
      regla('C4'),
    ]);
    const porClave = Object.fromEntries(
      grupos.map((g) => [g.clave, g.resumen]),
    );

    expect(porClave.P).toMatchObject({
      noAplican: 2,
      omitidas: 0,
      verificadas: 0,
    });
    expect(porClave.C).toMatchObject({
      noAplican: 0,
      omitidas: 1,
      verificadas: 1,
    });
  });
});
