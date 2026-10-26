// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { revisarObservacion } from '../api/auditoria.api';
import type { ObservacionUbicada } from '../types/auditoria.types';
import { TablaObservaciones } from './TablaObservaciones';

vi.mock('../api/auditoria.api', () => ({ revisarObservacion: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const abierta: ObservacionUbicada = {
  id: 40,
  mensaje: 'El saldo calculado no coincide con el informado.',
  estado: 'ABIERTA',
  valorInformado: 1400,
  valorCalculado: 1300,
  diferencia: 100,
  motivoDescarte: null,
  revisadaPor: null,
  revisadaEn: null,
  transaccionId: 12,
  libroTipo: 'LIBRO_BANCO',
  libroId: 2,
  libroNombre: 'Cta. Cte. 200/2',
  fila: 3,
};

function renderTabla(
  observaciones: ObservacionUbicada[] = [abierta],
  puedeRevisar = true,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TablaObservaciones
        codigoRegla="V3"
        observaciones={observaciones}
        ubicando={false}
        puedeRevisar={puedeRevisar}
        cuentaMensualId={5}
        onVerEnLibro={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TablaObservaciones', () => {
  it('muestra el estado de cada hallazgo y sus importes con formato es-AR', () => {
    renderTabla();

    expect(screen.getByText('Abierta')).toBeTruthy();
    expect(screen.getByText('1.400,00')).toBeTruthy();
    expect(screen.getByText('1.300,00')).toBeTruthy();
    expect(screen.getByText('100,00')).toBeTruthy();
  });

  it('un hallazgo que no es de un importe no muestra la línea de valores', () => {
    renderTabla([
      {
        ...abierta,
        valorInformado: null,
        valorCalculado: null,
        diferencia: null,
      },
    ]);

    expect(screen.queryByText('Informado')).toBeNull();
  });

  it('«Confirmar» confirma la observación', async () => {
    vi.mocked(revisarObservacion).mockResolvedValue({} as never);
    const user = renderTabla();

    await user.click(
      screen.getByRole('button', { name: 'Confirmar la observación 40' }),
    );

    await waitFor(() =>
      expect(revisarObservacion).toHaveBeenCalledWith(
        40,
        'CONFIRMAR',
        undefined,
      ),
    );
  });

  it('«Descartar» pide el motivo y no deja descartar sin él', async () => {
    vi.mocked(revisarObservacion).mockResolvedValue({} as never);
    const user = renderTabla();
    await user.click(
      screen.getByRole('button', { name: 'Descartar la observación 40' }),
    );

    const dialogo = await screen.findByRole('dialog');
    const descartar = within(dialogo).getByRole('button', {
      name: 'Descartar',
    }) as HTMLButtonElement;
    expect(descartar.disabled).toBe(true);
    await user.type(within(dialogo).getByLabelText('Motivo'), '   ');
    expect(descartar.disabled).toBe(true);

    await user.type(
      within(dialogo).getByLabelText('Motivo'),
      ' Ajuste de cierre ',
    );
    expect(descartar.disabled).toBe(false);
    await user.click(descartar);

    await waitFor(() =>
      expect(revisarObservacion).toHaveBeenCalledWith(
        40,
        'DESCARTAR',
        'Ajuste de cierre',
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('una confirmada o descartada se puede reabrir y muestra su motivo y quién la revisó', async () => {
    vi.mocked(revisarObservacion).mockResolvedValue({} as never);
    const user = renderTabla([
      {
        ...abierta,
        estado: 'DESCARTADA',
        motivoDescarte: 'Ajuste de cierre',
        revisadaPor: { id: 44, nombre: 'Luis', apellido: 'Gómez' },
        revisadaEn: '2026-10-26T15:42:00.000Z',
      },
    ]);

    expect(screen.getByText('Descartada')).toBeTruthy();
    expect(screen.getByText('Ajuste de cierre')).toBeTruthy();
    expect(screen.getByText(/Revisada por Luis Gómez/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Confirmar la observación/ }),
    ).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Reabrir la observación 40' }),
    );
    await waitFor(() =>
      expect(revisarObservacion).toHaveBeenCalledWith(40, 'REABRIR', undefined),
    );
  });

  it('con la auditoría cerrada o sin tomar no hay acciones de revisión', () => {
    renderTabla([abierta], false);

    expect(screen.getByText('Abierta')).toBeTruthy();
    for (const nombre of [/Confirmar/, /Descartar/, /Reabrir/]) {
      expect(screen.queryByRole('button', { name: nombre })).toBeNull();
    }
    // «Ver en el libro» sigue disponible
    expect(screen.getByRole('button', { name: /Ver la fila 3/ })).toBeTruthy();
  });

  it('un error del servidor se avisa con su mensaje', async () => {
    vi.mocked(revisarObservacion).mockRejectedValue(
      new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { message: 'La auditoría de esta rendición no está en curso.' },
      } as AxiosResponse),
    );
    const user = renderTabla();

    await user.click(
      screen.getByRole('button', { name: 'Confirmar la observación 40' }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'La auditoría de esta rendición no está en curso.',
      ),
    );
  });
});
