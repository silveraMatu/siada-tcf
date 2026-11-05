// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCuentasMensuales } from '@/features/cuentas/hooks/useCuentasMensuales';
import type { CuentaMensualListada } from '@/features/cuentas/types';
import { AsistentePage } from './AsistentePage';

vi.mock('@/features/cuentas/hooks/useCuentasMensuales', () => ({
  useCuentasMensuales: vi.fn(),
}));
vi.mock('./ChatCopiloto', () => ({
  ChatCopiloto: (props: { organismoId?: number; cuentaMensualId?: number }) => (
    <p>
      chat organismo={String(props.organismoId)} cuenta=
      {String(props.cuentaMensualId)}
    </p>
  ),
}));

const cuenta = (
  id: number,
  organismoId: number,
  organismoNombre: string,
): CuentaMensualListada => ({
  id,
  mes: 3,
  cuentaAnualId: 1,
  estado: 'LISTO_PARA_AUDITAR',
  fechaCreacion: '2026-03-01T00:00:00Z',
  presentadaPorId: null,
  presentadaPor: null,
  presentadaEn: null,
  organismoId,
  organismoNombre,
  ejercicioFiscal: 2026,
  libros: [],
});

function conCuentas(cuentas: CuentaMensualListada[]) {
  vi.mocked(useCuentasMensuales).mockReturnValue({
    data: cuentas,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  } as unknown as ReturnType<typeof useCuentasMensuales>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AsistentePage', () => {
  it('con un solo organismo lo preselecciona y abre el chat sobre todo el organismo', () => {
    conCuentas([
      cuenta(1, 7, 'Municipalidad A'),
      cuenta(2, 7, 'Municipalidad A'),
    ]);
    render(<AsistentePage />);
    expect(screen.getByText('chat organismo=7 cuenta=undefined')).toBeTruthy();
  });

  it('con varios organismos pide elegir uno antes de mostrar el chat', () => {
    conCuentas([cuenta(1, 7, 'Municipalidad A'), cuenta(2, 8, 'Hospital B')]);
    render(<AsistentePage />);
    expect(screen.getByText('Elija un organismo para empezar')).toBeTruthy();
    expect(screen.queryByText(/^chat organismo/)).toBeNull();
  });

  it('sin organismos explica por qué no hay nada que consultar', () => {
    conCuentas([]);
    render(<AsistentePage />);
    expect(
      screen.getByText('Todavía no hay organismos para consultar'),
    ).toBeTruthy();
  });

  it('muestra un esqueleto mientras carga', () => {
    vi.mocked(useCuentasMensuales).mockReturnValue({
      isPending: true,
    } as unknown as ReturnType<typeof useCuentasMensuales>);
    const { container } = render(<AsistentePage />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });
});
