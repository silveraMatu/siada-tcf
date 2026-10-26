// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cerrarAuditoria } from '../api/auditoria.api';
import { MOCK_EJECUCION } from '../mocks/resultados.mock';
import type { Ejecucion } from '../types/auditoria.types';
import { CierreAuditoria } from './CierreAuditoria';

vi.mock('../api/auditoria.api', () => ({ cerrarAuditoria: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const conConteo = (
  abiertas: number,
  confirmadas: number,
  descartadas: number,
): Ejecucion => ({
  ...MOCK_EJECUCION,
  observaciones: { abiertas, confirmadas, descartadas },
});

function renderCierre(ejecucion: Ejecucion, enCurso = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { container } = render(
    <QueryClientProvider client={client}>
      <CierreAuditoria
        cuentaMensualId={5}
        ejecucion={ejecucion}
        enCurso={enCurso}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), container };
}

const boton = () =>
  screen.getByRole('button', { name: 'Cerrar auditoría' }) as HTMLButtonElement;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CierreAuditoria', () => {
  it('con observaciones abiertas no deja cerrar y dice cuántas quedan', () => {
    renderCierre(conConteo(2, 1, 0));

    expect(boton().disabled).toBe(true);
    expect(
      screen.getByText('Quedan 2 observaciones sin revisar.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('list', { name: 'Estado de la revisión' }).textContent,
    ).toMatch(/2\s*abiertas.*1\s*confirmada.*0\s*descartadas/);
  });

  it('con todo revisado pide la conclusión y recién entonces deja cerrar', async () => {
    const { user } = renderCierre(conConteo(0, 1, 1));
    expect(
      screen.getByText('Escriba la conclusión para poder cerrar.'),
    ).toBeTruthy();
    expect(boton().disabled).toBe(true);

    await user.type(
      screen.getByLabelText('Conclusión'),
      'Se confirmó una diferencia.',
    );

    expect(boton().disabled).toBe(false);
    expect(screen.getByText(/27 de 5000 caracteres/)).toBeTruthy();
  });

  it('anticipa el estado final: con una confirmada queda «Con observaciones»', async () => {
    const { user } = renderCierre(conConteo(0, 1, 0));
    await user.type(screen.getByLabelText('Conclusión'), 'Hay una diferencia.');

    await user.click(boton());

    const aviso = await screen.findByText(/La rendición quedará/);
    expect(aviso.textContent).toMatch(/Con observaciones/);
  });

  it('sin confirmadas queda «Auditada», cierra con la conclusión recortada y avisa', async () => {
    vi.mocked(cerrarAuditoria).mockResolvedValue({
      ...MOCK_EJECUCION,
      cerradaEn: '2026-10-26T16:00:00.000Z',
      estadoFinal: 'AUDITADA',
    });
    const { user } = renderCierre(conConteo(0, 0, 2));
    await user.type(
      screen.getByLabelText('Conclusión'),
      '  Sin diferencias.  ',
    );

    await user.click(boton());
    expect(
      (await screen.findByText(/La rendición quedará/)).textContent,
    ).toMatch(/Auditada/);
    await user.click(
      screen.getAllByRole('button', { name: 'Cerrar auditoría' }).at(-1)!,
    );

    await waitFor(() =>
      expect(cerrarAuditoria).toHaveBeenCalledWith(5, 'Sin diferencias.'),
    );
    expect(toast.success).toHaveBeenCalledWith('Auditoría cerrada');
  });

  it('una auditoría cerrada es de solo lectura: estado final, conclusión, cuándo y quién', () => {
    renderCierre(
      {
        ...conConteo(0, 1, 1),
        cerradaEn: '2026-10-26T16:00:00.000Z',
        cerradaPor: { id: 44, nombre: 'Luis', apellido: 'Gómez' },
        conclusion: 'Se confirmó una diferencia.\nVer observación 40.',
        estadoFinal: 'CON_OBSERVACIONES',
      },
      false,
    );

    expect(screen.getByText('Auditoría cerrada')).toBeTruthy();
    expect(screen.getByText('Con Observaciones')).toBeTruthy();
    expect(screen.getByText(/por Luis Gómez/)).toBeTruthy();
    expect(screen.getByText(/Se confirmó una diferencia\./)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Cerrar auditoría' }),
    ).toBeNull();
    expect(screen.queryByLabelText('Conclusión')).toBeNull();
  });

  it('si no está en curso ni cerrada no muestra nada', () => {
    const { container } = renderCierre(conConteo(1, 0, 0), false);

    expect(container.textContent).toBe('');
  });
});
