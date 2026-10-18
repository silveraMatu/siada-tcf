// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerOrganismos } from '@/features/organismos/api/organismos.api';
import type { Organismo } from '@/features/organismos/types';
import {
  asignarOrganismo,
  obtenerResponsablesSinOrganismo,
} from '../api/responsables.api';
import type { Responsable } from '../types';
import { ResponsablesPage } from './ResponsablesPage';

vi.mock('../api/responsables.api', () => ({
  obtenerResponsablesSinOrganismo: vi.fn(),
  asignarOrganismo: vi.fn(),
  asegurarResponsable: vi.fn(),
}));
vi.mock('@/features/organismos/api/organismos.api', () => ({
  obtenerOrganismos: vi.fn(),
  crearOrganismo: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

// jsdom no implementa estas APIs que usa Radix Select.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const responsable = (id: number, nombre: string, active = true): Responsable => ({
  id,
  usuarioId: id + 100,
  active,
  organismoId: null,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  usuario: {
    id: id + 100,
    nombre,
    apellido: 'Gómez',
    email: `${nombre.toLowerCase()}@siada.gob.ar`,
  },
});

const organismo = (id: number, nombre: string, active = true): Organismo => ({
  id,
  nombre,
  rubro: 'Municipio',
  active,
  fechaCreacion: '2026-10-01T12:00:00.000Z',
});

function renderPagina() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ResponsablesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.mocked(obtenerResponsablesSinOrganismo).mockResolvedValue([
    responsable(1, 'Lucía'),
    responsable(2, 'Marcos'),
  ]);
  vi.mocked(obtenerOrganismos).mockResolvedValue([
    organismo(10, 'Municipalidad de Clorinda'),
    organismo(11, 'Comisión de Fomento'),
    organismo(12, 'Organismo Inactivo', false),
  ]);
  vi.mocked(asignarOrganismo).mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const asignar = (tarjeta: HTMLElement) =>
  within(tarjeta).getByRole('button', { name: 'Asignar' }) as HTMLButtonElement;

describe('ResponsablesPage', () => {
  it('muestra los responsables sin organismo con su nombre y email', async () => {
    renderPagina();
    expect(await screen.findByText('Lucía Gómez')).toBeTruthy();
    expect(screen.getByText('lucía@siada.gob.ar')).toBeTruthy();
    expect(screen.getByText('Marcos Gómez')).toBeTruthy();
    expect(screen.getByText('2 responsables pendientes')).toBeTruthy();
    expect(screen.getByText('Vinculación de Responsables')).toBeTruthy();
  });

  it('"Asignar" se habilita al elegir un organismo activo (los inactivos no se ofrecen)', async () => {
    const user = renderPagina();
    const tarjeta = (await screen.findByText('Lucía Gómez')).closest('li')!;
    expect(asignar(tarjeta).disabled).toBe(true);

    await user.click(
      within(tarjeta).getByRole('combobox', { name: /organismo para lucía/i }),
    );
    expect(screen.getByRole('option', { name: 'Municipalidad de Clorinda' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Organismo Inactivo' })).toBeNull();

    await user.click(screen.getByRole('option', { name: 'Comisión de Fomento' }));
    expect(asignar(tarjeta).disabled).toBe(false);
  });

  it('asigna el organismo y la tarjeta desaparece al refrescar la lista', async () => {
    vi.mocked(obtenerResponsablesSinOrganismo)
      .mockResolvedValueOnce([responsable(1, 'Lucía'), responsable(2, 'Marcos')])
      .mockResolvedValue([responsable(2, 'Marcos')]);

    const user = renderPagina();
    const tarjeta = (await screen.findByText('Lucía Gómez')).closest('li')!;
    await user.click(
      within(tarjeta).getByRole('combobox', { name: /organismo para lucía/i }),
    );
    await user.click(screen.getByRole('option', { name: 'Comisión de Fomento' }));
    await user.click(asignar(tarjeta));

    await waitFor(() => expect(asignarOrganismo).toHaveBeenCalledWith(1, 11));
    await waitFor(() => expect(screen.queryByText('Lucía Gómez')).toBeNull());
    expect(screen.getByText('Marcos Gómez')).toBeTruthy();
    expect(screen.getByText('1 responsable pendiente')).toBeTruthy();
  });

  it('muestra el estado vacío cuando no hay responsables pendientes', async () => {
    vi.mocked(obtenerResponsablesSinOrganismo).mockResolvedValue([]);
    renderPagina();
    expect(
      await screen.findByText('No hay responsables pendientes de asignación'),
    ).toBeTruthy();
  });

  it('avisa cuando no hay organismos activos', async () => {
    vi.mocked(obtenerOrganismos).mockResolvedValue([
      organismo(12, 'Organismo Inactivo', false),
    ]);
    renderPagina();
    expect(
      await screen.findByText(/no hay organismos activos disponibles/i),
    ).toBeTruthy();
    const tarjeta = screen.getByText('Lucía Gómez').closest('li')!;
    expect(within(tarjeta).getByRole('combobox').hasAttribute('disabled')).toBe(true);
  });

  it('no permite asignar a un responsable inactivo', async () => {
    vi.mocked(obtenerResponsablesSinOrganismo).mockResolvedValue([
      responsable(1, 'Lucía', false),
    ]);
    const user = renderPagina();
    const tarjeta = (await screen.findByText('Lucía Gómez')).closest('li')!;
    expect(within(tarjeta).getByText(/responsable inactivo/i)).toBeTruthy();

    await user.click(within(tarjeta).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Comisión de Fomento' }));
    expect(asignar(tarjeta).disabled).toBe(true);
  });

  it('sin sesión (401) invita a iniciar sesión', async () => {
    vi.mocked(obtenerResponsablesSinOrganismo).mockRejectedValue(
      new AxiosError('x', 'ERR', undefined, undefined, {
        status: 401,
        data: {},
      } as AxiosResponse),
    );
    renderPagina();
    expect(
      await screen.findByText(/debe iniciar sesión como administrador/i),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy();
  });
});
