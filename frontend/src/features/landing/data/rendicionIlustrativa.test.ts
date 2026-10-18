import { describe, expect, it } from 'vitest';

import {
  conciliar,
  formatearImporte,
  rendicionIlustrativa,
} from './rendicionIlustrativa';

describe('conciliar', () => {
  it('detecta la diferencia entre el saldo calculado y el informado', () => {
    const resultado = conciliar(rendicionIlustrativa);

    expect(resultado.totalDepositos).toBe(480000);
    expect(resultado.totalRetiros).toBe(512400);
    expect(resultado.saldoCalculado).toBe(1217600);
    expect(resultado.diferencia).toBe(12400);
    expect(resultado.cuadra).toBe(false);
  });

  it('marca la rendición como conciliada cuando los saldos coinciden', () => {
    const resultado = conciliar({
      ...rendicionIlustrativa,
      saldoInformado: 1217600,
    });

    expect(resultado.diferencia).toBe(0);
    expect(resultado.cuadra).toBe(true);
  });
});

describe('formatearImporte', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatearImporte(1250000)).toBe('1.250.000,00');
    expect(formatearImporte(12400)).toBe('12.400,00');
  });
});
