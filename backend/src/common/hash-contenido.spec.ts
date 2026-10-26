import { calcularHashContenido } from './hash-contenido.js';

describe('calcularHashContenido', () => {
  it('es un sha256 en hexadecimal (64 caracteres)', () => {
    expect(calcularHashContenido(['a', 1])).toMatch(/^[0-9a-f]{64}$/);
  });

  it('el mismo contenido da el mismo hash', () => {
    const contenido = ['100/1', [['2026-03-01', null, 'Pago', 0, 10, 90]]];

    expect(calcularHashContenido(contenido)).toBe(
      calcularHashContenido(structuredClone(contenido)),
    );
  });

  it('cambiar un solo dato cambia el hash', () => {
    const original = calcularHashContenido(['100/1', [['Pago', 0, 10, 90]]]);

    expect(calcularHashContenido(['100/1', [['Pago', 0, 10, 91]]])).not.toBe(
      original,
    );
    expect(calcularHashContenido(['100/2', [['Pago', 0, 10, 90]]])).not.toBe(
      original,
    );
  });

  it('el orden de las filas importa', () => {
    expect(calcularHashContenido([[1], [2]])).not.toBe(
      calcularHashContenido([[2], [1]]),
    );
  });
});
