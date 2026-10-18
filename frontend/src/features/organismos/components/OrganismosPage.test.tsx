// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { crearOrganismo, obtenerOrganismos } from '../api/organismos.api';
import type { Organismo } from '../types';
import { OrganismosPage } from './OrganismosPage';

vi.mock('../api/organismos.api', () => ({
  obtenerOrganismos: vi.fn(),
  crearOrganismo: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const crear = (id: number, nombre: string, active = true): Organismo => ({
  id,
  nombre,
  rubro: 'Municipio',
  active,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
});

function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrganismosPage />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OrganismosPage', () => {
  it('lista los organismos ordenados con su rubro y estado', async () => {
    vi.mocked(obtenerOrganismos).mockResolvedValue([
      crear(2, 'Municipalidad de Pirané'),
      crear(1, 'Comisión de Fomento', false),
    ]);
    renderPagina();

    expect(await screen.findByText('Municipalidad de Pirané')).toBeTruthy();
    const filas = screen.getAllByRole('row').slice(1);
    expect(within(filas[0]).getByText('Comisión de Fomento')).toBeTruthy();
    expect(within(filas[0]).getByText('Inactivo')).toBeTruthy();
    expect(within(filas[1]).getByText('Municipalidad de Pirané')).toBeTruthy();
    expect(within(filas[1]).getByText('Activo')).toBeTruthy();
    expect(screen.getByText('2 organismos')).toBeTruthy();
    expect(screen.getByText('Gestión de Organismos')).toBeTruthy();
  });

  it('muestra un estado vacío cuando no hay organismos', async () => {
    vi.mocked(obtenerOrganismos).mockResolvedValue([]);
    renderPagina();
    expect(
      await screen.findByText('Aún no hay organismos registrados'),
    ).toBeTruthy();
  });

  it('muestra el error del servidor con la opción de reintentar', async () => {
    vi.mocked(obtenerOrganismos).mockRejectedValue(new Error('Sin conexión'));
    renderPagina();
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('al crear un organismo el listado se actualiza', async () => {
    const nuevo = crear(3, 'Escuela N° 12');
    vi.mocked(obtenerOrganismos)
      .mockResolvedValueOnce([crear(1, 'Comisión de Fomento')])
      .mockResolvedValue([crear(1, 'Comisión de Fomento'), nuevo]);
    vi.mocked(crearOrganismo).mockResolvedValue(nuevo);

    const user = renderPagina();
    await screen.findByText('Comisión de Fomento');
    expect(screen.queryByText('Escuela N° 12')).toBeNull();

    await user.click(screen.getByRole('button', { name: /nuevo organismo/i }));
    await user.type(
      await screen.findByLabelText('Nombre del Organismo'),
      'Escuela N° 12',
    );
    await user.type(screen.getByLabelText('Rubro'), 'Municipio');
    await user.click(screen.getByRole('button', { name: 'Crear Organismo' }));

    expect(await screen.findByText('Escuela N° 12')).toBeTruthy();
    expect(screen.getByText('2 organismos')).toBeTruthy();
  });
});
