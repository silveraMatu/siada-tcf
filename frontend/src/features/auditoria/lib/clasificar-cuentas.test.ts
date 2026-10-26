import { describe, expect, it } from 'vitest';

import type { CuentaMensualListada } from '@/features/cuentas/types';
import { clasificarCuentas } from './clasificar-cuentas';

const cuenta = (id: number, estado: string): CuentaMensualListada => ({
  id,
  mes: 3,
  cuentaAnualId: 1,
  estado,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  presentadaPorId: null,
  presentadaPor: null,
  presentadaEn: null,
  organismoId: 1,
  organismoNombre: 'Municipalidad',
  ejercicioFiscal: 2026,
  libros: [],
});

describe('clasificarCuentas', () => {
  it('reparte las rendiciones en las tres pestañas del auditor', () => {
    const { paraAuditar, enCurso, cerradas } = clasificarCuentas([
      cuenta(1, 'LISTO_PARA_AUDITAR'),
      cuenta(2, 'EN_AUDITORIA'),
      cuenta(3, 'AUDITADA'),
      cuenta(4, 'CON_OBSERVACIONES'),
      cuenta(5, 'LISTO_PARA_AUDITAR'),
    ]);

    expect(paraAuditar.map((c) => c.id)).toEqual([1, 5]);
    expect(enCurso.map((c) => c.id)).toEqual([2]);
    expect(cerradas.map((c) => c.id)).toEqual([3, 4]);
  });

  it('ignora las que siguen en borrador y los estados que no conoce', () => {
    const resultado = clasificarCuentas([
      cuenta(1, 'EN_BORRADOR'),
      cuenta(2, 'ESTADO_NUEVO'),
    ]);

    expect(resultado).toEqual({ paraAuditar: [], enCurso: [], cerradas: [] });
  });
});
