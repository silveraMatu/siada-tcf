import { normalizarCheque } from './cheques.js';

describe('normalizarCheque', () => {
  it.each([
    ['  123  ', '123'],
    ['000123', '123'],
    ['0', '0'],
    ['000', '0'],
    ['ch-001', 'CH-001'],
    ['  ab 12 ', 'AB 12'],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizarCheque(entrada)).toBe(esperado);
  });

  it.each([[null], [undefined], [''], ['   ']])(
    '%j no es un cheque',
    (entrada) => {
      expect(normalizarCheque(entrada)).toBeNull();
    },
  );
});
