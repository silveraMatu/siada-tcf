// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { obtenerLibrosBanco } from '@/features/libro-banco/api/libro-banco.api';
import { presentarCuentaMensual } from '../api/cuentas.api';
import type { ContextoCuenta, CuentaMensual } from '../types';
import { CuentaMensualDetalle } from './CuentaMensualDetalle';

vi.mock('../api/cuentas.api', () => ({
  presentarCuentaMensual: vi.fn(),
  resolverCuentaMensual: vi.fn(),
}));
vi.mock('@/features/libro-banco/api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const contexto: ContextoCuenta = {
  organismoId: 3,
  organismoNombre: 'Municipalidad de Pirané',
  ejercicioFiscal: 2026,
  mes: 3,
};

const cuenta = (estado: string): CuentaMensual => ({
  id: 5,
  mes: 3,
  cuentaAnualId: 9,
  estado,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
});

function renderDetalle(estado: string, onActualizada = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CuentaMensualDetalle
        cuenta={cuenta(estado)}
        contexto={contexto}
        onActualizada={onActualizada}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onActualizada };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CuentaMensualDetalle', () => {
  describe('en borrador', () => {
    it('ofrece cargar documentos y presentar, sin el aviso de bloqueo', () => {
      renderDetalle('EN_BORRADOR');

      expect(
        screen.getByRole('button', { name: 'Cargar Documentos' }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Presentar Rendición Definitiva' }),
      ).toBeTruthy();
      expect(screen.queryByText(/bloqueada para modificaciones/)).toBeNull();
      expect(obtenerLibrosBanco).not.toHaveBeenCalled();
    });

    it('advierte antes de presentar y no envía si se cancela', async () => {
      const { user } = renderDetalle('EN_BORRADOR');

      await user.click(
        screen.getByRole('button', { name: 'Presentar Rendición Definitiva' }),
      );
      expect(
        await screen.findByText(/No podrá modificar ni subir más archivos/),
      ).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(presentarCuentaMensual).not.toHaveBeenCalled();
    });

    it('al confirmar presenta la cuenta y avisa a la vista con la cuenta actualizada', async () => {
      vi.mocked(presentarCuentaMensual).mockResolvedValue(
        cuenta('LISTO_PARA_AUDITAR'),
      );
      const { user, onActualizada } = renderDetalle('EN_BORRADOR');

      await user.click(
        screen.getByRole('button', { name: 'Presentar Rendición Definitiva' }),
      );
      await user.click(
        await screen.findByRole('button', { name: 'Presentar' }),
      );

      await waitFor(() => expect(onActualizada).toHaveBeenCalledTimes(1));
      expect(vi.mocked(presentarCuentaMensual).mock.calls[0][0]).toBe(5);
      expect(onActualizada.mock.calls[0][0]).toMatchObject({
        id: 5,
        estado: 'LISTO_PARA_AUDITAR',
      });
    });
  });

  describe.each([
    ['LISTO_PARA_AUDITAR', 'Listo para Auditar'],
    ['EN_AUDITORIA', 'En Auditoría'],
    ['AUDITADA', 'Auditada'],
  ])('presentada (%s)', (estado, etiqueta) => {
    it('bloquea la carga, indica el estado y muestra el libro guardado en solo lectura', async () => {
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([
        {
          id: 1,
          cuentaMensualId: 5,
          numeroCuentaCte: '123/4',
          fechaCreacion: '2026-10-15T12:00:00.000Z',
          transacciones: [
            {
              id: 10,
              fecha: '2026-03-02',
              cheque: null,
              aLaOrdenDe: 'Proveedor SA',
              depositos: 0,
              retiro: 1500.5,
              saldo: 8499.5,
            },
          ],
        },
      ]);
      renderDetalle(estado);

      expect(
        screen.getByText(/ya ha sido presentada y se encuentra bloqueada/),
      ).toBeTruthy();
      expect(screen.getAllByText(etiqueta).length).toBeGreaterThan(0);
      expect(
        screen.queryByRole('button', { name: 'Cargar Documentos' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', {
          name: 'Presentar Rendición Definitiva',
        }),
      ).toBeNull();

      expect(await screen.findByText('Proveedor SA')).toBeTruthy();
      expect(screen.getByText(/Cta\. Cte\. 123\/4/)).toBeTruthy();
    });
  });

  it('un estado desconocido también se trata como bloqueado', () => {
    vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
    renderDetalle('ESTADO_NUEVO');

    expect(screen.getByText(/bloqueada para modificaciones/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Cargar Documentos' }),
    ).toBeNull();
  });

  it('avisa si la presentada no tiene libros', async () => {
    vi.mocked(obtenerLibrosBanco).mockResolvedValue([]);
    renderDetalle('LISTO_PARA_AUDITAR');

    expect(
      await screen.findByText('Esta rendición no tiene libros cargados'),
    ).toBeTruthy();
  });
});
