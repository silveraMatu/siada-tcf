import { describe, expect, it } from 'vitest';

import type { CuentaMensualListada } from '@/features/cuentas/types';
import { agruparPorOrganismo } from './agrupar-por-organismo';

const cuenta = (
  id: number,
  organismoId: number,
  organismoNombre: string,
  mes: number,
  ejercicioFiscal: number,
): CuentaMensualListada => ({
  id,
  mes,
  cuentaAnualId: 1,
  estado: 'LISTO_PARA_AUDITAR',
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  organismoId,
  organismoNombre,
  ejercicioFiscal,
  libros: [],
});

describe('agruparPorOrganismo', () => {
  it('sin cuentas no hay grupos', () => {
    expect(agruparPorOrganismo([])).toEqual([]);
  });

  it('junta en un grupo las rendiciones del mismo organismo', () => {
    const grupos = agruparPorOrganismo([
      cuenta(1, 10, 'Pirané', 3, 2026),
      cuenta(2, 20, 'Fomento', 1, 2026),
      cuenta(3, 10, 'Pirané', 4, 2026),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos.find((g) => g.organismoId === 10)?.rendiciones).toHaveLength(
      2,
    );
  });

  it('ordena los organismos alfabéticamente, con acentos y eñes en su lugar', () => {
    const grupos = agruparPorOrganismo([
      cuenta(1, 1, 'Ñandú', 1, 2026),
      cuenta(2, 2, 'Escuela', 1, 2026),
      cuenta(3, 3, 'Álamo', 1, 2026),
      cuenta(4, 4, 'Municipalidad', 1, 2026),
    ]);

    expect(grupos.map((g) => g.organismoNombre)).toEqual([
      'Álamo',
      'Escuela',
      'Municipalidad',
      'Ñandú',
    ]);
  });

  it('ordena las rendiciones de más nueva a más vieja, primero por ejercicio y luego por mes', () => {
    const [grupo] = agruparPorOrganismo([
      cuenta(1, 10, 'Pirané', 3, 2026),
      cuenta(2, 10, 'Pirané', 12, 2025),
      cuenta(3, 10, 'Pirané', 4, 2026),
      cuenta(4, 10, 'Pirané', 1, 2026),
    ]);

    expect(grupo.rendiciones.map((c) => c.id)).toEqual([3, 1, 4, 2]);
  });

  it('no modifica la lista original', () => {
    const original = [
      cuenta(1, 10, 'Pirané', 3, 2026),
      cuenta(2, 10, 'Pirané', 4, 2026),
    ];

    agruparPorOrganismo(original);

    expect(original.map((c) => c.id)).toEqual([1, 2]);
  });
});
