import { describe, expect, it } from 'vitest';

import type { PasoRazonamiento } from '../types';
import { aplicarPaso } from './useConsultarAsistente';

const paso = (id: string, estado: string): PasoRazonamiento => ({
  id,
  accion: 'consulta_datos',
  descripcion: id,
  fuentes: [],
  estado,
  resultado: null,
  cantidadRegistros: null,
  duracionMs: null,
  parcial: false,
});

describe('aplicarPaso', () => {
  it('agrega los pasos nuevos al final', () => {
    expect(
      aplicarPaso([paso('a', 'en_curso')], paso('b', 'en_curso')).map(
        (p) => p.id,
      ),
    ).toEqual(['a', 'b']);
  });

  it('reemplaza en su lugar al paso con el mismo id', () => {
    const resultado = aplicarPaso(
      [paso('a', 'en_curso'), paso('b', 'en_curso')],
      paso('a', 'completado'),
    );
    expect(resultado.map((p) => `${p.id}:${p.estado}`)).toEqual([
      'a:completado',
      'b:en_curso',
    ]);
  });
});
