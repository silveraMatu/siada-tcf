// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilaRaiPreview } from '../types';
import { PreviewRaiTable } from './PreviewRaiTable';

const fila = (
  n: number,
  extra: Partial<FilaRaiPreview> = {},
  transaccion: Partial<FilaRaiPreview['transaccion']> = {},
): FilaRaiPreview => ({
  fila: n + 18,
  transaccion: {
    fecha: '2026-09-01',
    concepto: `Ingreso ${n}`,
    ingresosDiarios: 48895890,
    ingresosMensuales: 48895890,
    ingresosAcumulados: 539195890,
    saldo: 215604110,
    ...transaccion,
  },
  errores: [],
  ...extra,
});

beforeEach(() => {
  // jsdom no implementa scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

describe('PreviewRaiTable', () => {
  it('muestra la fecha armada y los importes con formato es-AR', () => {
    render(<PreviewRaiTable filas={[fila(1)]} />);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('01/09/2026')).toBeTruthy();
    expect(within(tabla).getByText('539.195.890,00')).toBeTruthy();
    expect(
      screen.getAllByRole('columnheader').map((c) => c.textContent),
    ).toEqual([
      '#',
      'Asto. N°',
      'Fecha',
      'Planilla N°',
      'Concepto',
      'Ingresos diarios',
      'Ingresos mensuales',
      'Ingresos acumulados',
      'Saldo',
    ]);
  });

  it('el N° de asiento y la planilla pueden faltar: se muestran vacíos, no inventados', () => {
    render(
      <PreviewRaiTable
        filas={[fila(1), fila(2, {}, { asiento: 7, planillaNumero: '166' })]}
      />,
    );
    const celdas = screen.getAllByRole('row').slice(1);
    expect(within(celdas[0]).getAllByText('—')).toHaveLength(2);
    expect(within(celdas[1]).getByText('7')).toBeTruthy();
    expect(within(celdas[1]).getByText('166')).toBeTruthy();
  });

  it('no muestra la partida ni el total autorizado', () => {
    render(<PreviewRaiTable filas={[fila(1)]} />);
    expect(screen.queryByRole('columnheader', { name: /partida/i })).toBeNull();
    expect(screen.queryByText(/autorizado/i)).toBeNull();
  });

  it('un asiento con errores los muestra bajo el concepto', () => {
    render(
      <PreviewRaiTable
        filas={[fila(1, { errores: ['El mes es obligatorio'] })]}
      />,
    );
    expect(screen.getByText('El mes es obligatorio')).toBeTruthy();
  });

  it('las filas de un libro guardado se ubican por id y la marcada queda señalada', () => {
    render(
      <PreviewRaiTable
        filas={[fila(1, { id: 801 }), fila(2, { id: 802 })]}
        resaltar={{ transaccionId: 802, clave: 1 }}
      />,
    );
    expect(
      document
        .querySelector('[data-transaccion-id="802"]')
        ?.getAttribute('aria-current'),
    ).toBe('true');
    expect(
      document
        .querySelector('[data-transaccion-id="801"]')
        ?.getAttribute('aria-current'),
    ).toBeNull();
  });

  it('el contenido del archivo se pinta como texto, no como HTML', () => {
    render(
      <PreviewRaiTable
        filas={[fila(1, {}, { concepto: '<img src=x onerror=alert(1)>' })]}
      />,
    );
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  });
});
