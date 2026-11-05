// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilaRaciPreview } from '../types';
import { PreviewRaciTable } from './PreviewRaciTable';

const fila = (
  asiento: number,
  extra: Partial<FilaRaciPreview> = {},
  cheque?: string,
): FilaRaciPreview => ({
  fila: asiento + 3,
  transaccion: {
    asiento,
    fecha: '2026-03-02',
    concepto: `Concepto ${asiento}`,
    ...(cheque ? { pagoNumeroCheque: cheque } : {}),
    compromisoDelMes: 1500.5,
    compromisoAcumulado: 1500.5,
    devengadoDelMes: 0,
    devengadoAcumulado: 0,
    devengadoSaldo: 1500.5,
    pagoDelMes: 0,
    pagoAcumulado: 0,
    pagoSaldoAPagar: 0,
  },
  errores: [],
  ...extra,
});

beforeEach(() => {
  // jsdom no implementa scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

describe('PreviewRaciTable', () => {
  it('muestra el N° de asiento, la fecha y los importes con formato es-AR', () => {
    render(<PreviewRaciTable filas={[fila(1), fila(2)]} />);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('Concepto 1')).toBeTruthy();
    expect(within(tabla).getAllByText('02/03/2026')).toHaveLength(2);
    expect(within(tabla).getAllByText('1.500,50').length).toBeGreaterThan(0);
    expect(
      within(tabla).getByRole('columnheader', { name: 'N° As.' }),
    ).toBeTruthy();
  });

  it('pone cada texto bajo el grupo al que pertenece en la planilla', () => {
    render(<PreviewRaciTable filas={[fila(1, {}, '4567')]} />);
    const titulos = screen
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(titulos).toEqual([
      '#',
      'N° As.',
      'Fecha',
      'Expte. N°',
      'Concepto',
      'Instr. legal',
      'Compromiso (Del mes)',
      'Compromiso (Acumulado)',
      'Ord. de provisión',
      'Devengado (Del mes)',
      'Devengado (Acumulado)',
      'Devengado (Saldo)',
      'Ord. de pago',
      'Cheque',
      'Pago (Del mes)',
      'Pago (Acumulado)',
      'Pago (Saldo a pagar)',
    ]);
    expect(screen.getByText('4567')).toBeTruthy();
  });

  it('muestra la partida solo si la planilla la trae', () => {
    const { rerender } = render(<PreviewRaciTable filas={[fila(1)]} />);
    expect(screen.queryByRole('columnheader', { name: 'Partida' })).toBeNull();

    rerender(<PreviewRaciTable filas={[fila(1, { partida: '2 · 2.1' })]} />);
    expect(screen.getByRole('columnheader', { name: 'Partida' })).toBeTruthy();
    expect(screen.getByText('2 · 2.1')).toBeTruthy();
  });

  it('un asiento con errores los muestra bajo el concepto', () => {
    render(
      <PreviewRaciTable
        filas={[fila(1, { errores: ['La fecha es obligatoria'] })]}
      />,
    );
    expect(screen.getByText('La fecha es obligatoria')).toBeTruthy();
  });

  it('las filas de un libro guardado se pueden ubicar por su id y la marcada queda señalada', () => {
    render(
      <PreviewRaciTable
        filas={[fila(1, { id: 701 }), fila(2, { id: 702 })]}
        resaltar={{ transaccionId: 702, clave: 1 }}
      />,
    );
    const marcada = document.querySelector('[data-transaccion-id="702"]');
    expect(marcada?.getAttribute('aria-current')).toBe('true');
    expect(
      document
        .querySelector('[data-transaccion-id="701"]')
        ?.getAttribute('aria-current'),
    ).toBeNull();
  });

  it('el contenido del archivo se pinta como texto, no como HTML', () => {
    render(
      <PreviewRaciTable
        filas={[
          fila(1, {
            transaccion: {
              ...fila(1).transaccion,
              concepto: '<img src=x onerror=alert(1)>',
            },
          }),
        ]}
      />,
    );
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  });
});
