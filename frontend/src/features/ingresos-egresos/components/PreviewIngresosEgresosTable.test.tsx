// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { FilaIngresoEgresoPreview } from '../types';
import { PreviewIngresosEgresosTable } from './PreviewIngresosEgresosTable';

const base = {
  concepto: 'Cobro de tasas',
  fecha: '2026-03-02',
  cajaDebe: 0,
  cajaHaber: 0,
  cajaSaldo: 1500.5,
  bancoDebe: 0,
  bancoHaber: 0,
  bancoSaldo: -250,
  egresoInc1: 0,
  egresoInc2: 0,
  egresoInc3: 0,
  egresoInc4: 0,
  egresoInc5: 0,
  ingresoMunicipal: 0,
  ingresoOtras: 0,
  cuentasVariasDebe: 0,
  cuentasVariasHaber: 0,
};

const filas: FilaIngresoEgresoPreview[] = [
  { transaccion: { ...base, fila: 4 }, errores: [] },
  {
    transaccion: { ...base, fila: 5, concepto: '', cheque: '0042' },
    errores: ['El concepto es obligatorio'],
  },
];

afterEach(cleanup);

describe('PreviewIngresosEgresosTable', () => {
  it('muestra fecha, concepto y los saldos de caja y banco con formato es-AR', () => {
    render(<PreviewIngresosEgresosTable filas={filas} />);

    for (const titulo of [
      'Fecha',
      'Concepto',
      'Caja (Saldo)',
      'Banco (Saldo)',
    ]) {
      expect(screen.getByRole('columnheader', { name: titulo })).toBeTruthy();
    }
    const [, primera] = screen.getAllByRole('row');
    expect(within(primera).getByText('02/03/2026')).toBeTruthy();
    expect(within(primera).getByText('Cobro de tasas')).toBeTruthy();
    expect(within(primera).getByText('1.500,50')).toBeTruthy();
    expect(within(primera).getByText('-250,00')).toBeTruthy();
  });

  it('tiene las 20 columnas de la planilla en un contenedor con desplazamiento horizontal', () => {
    const { container } = render(<PreviewIngresosEgresosTable filas={filas} />);

    // 19 de la planilla + el número de fila
    expect(screen.getAllByRole('columnheader')).toHaveLength(21);
    expect(container.firstElementChild?.className).toContain('overflow-x-auto');
  });

  it('marca con su motivo las filas con errores', () => {
    render(<PreviewIngresosEgresosTable filas={filas} />);

    const filaConError = screen.getAllByRole('row')[2];
    expect(
      within(filaConError).getByText('El concepto es obligatorio'),
    ).toBeTruthy();
    expect(within(filaConError).getByText('0042')).toBeTruthy();
    expect(screen.getAllByRole('row')[1].className).not.toContain('danger');
  });
});
