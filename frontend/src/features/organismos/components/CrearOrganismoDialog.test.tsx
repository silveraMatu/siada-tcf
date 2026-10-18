// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearOrganismo } from '../api/organismos.api';
import { CrearOrganismoDialog } from './CrearOrganismoDialog';

vi.mock('../api/organismos.api', () => ({
  crearOrganismo: vi.fn(),
  obtenerOrganismos: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CrearOrganismoDialog />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /nuevo organismo/i }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  vi.mocked(crearOrganismo).mockResolvedValue({
    id: 1,
    nombre: 'Municipalidad de Clorinda',
    rubro: 'Municipio',
    active: true,
    fechaCreacion: '2026-10-15T12:00:00.000Z',
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CrearOrganismoDialog', () => {
  it('abre el modal con los dos campos', async () => {
    const user = renderDialog();
    await abrir(user);
    expect(screen.getByLabelText('Nombre del Organismo')).toBeTruthy();
    expect(screen.getByLabelText('Rubro')).toBeTruthy();
  });

  it('valida los campos obligatorios sin llamar a la API', async () => {
    const user = renderDialog();
    await abrir(user);
    await user.click(screen.getByRole('button', { name: 'Crear Organismo' }));

    expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
    expect(screen.getByText('El rubro es obligatorio')).toBeTruthy();
    expect(crearOrganismo).not.toHaveBeenCalled();
  });

  it('crea el organismo con los valores recortados y cierra el modal', async () => {
    const user = renderDialog();
    await abrir(user);
    await user.type(
      screen.getByLabelText('Nombre del Organismo'),
      '  Municipalidad de Clorinda ',
    );
    await user.type(screen.getByLabelText('Rubro'), 'Municipio');
    await user.click(screen.getByRole('button', { name: 'Crear Organismo' }));

    await waitFor(() =>
      expect(crearOrganismo).toHaveBeenCalledWith({
        nombre: 'Municipalidad de Clorinda',
        rubro: 'Municipio',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('si la API falla, mantiene el modal abierto con el mensaje y lo escrito', async () => {
    vi.mocked(crearOrganismo).mockRejectedValue(new Error('Servidor caído'));
    const user = renderDialog();
    await abrir(user);
    await user.type(screen.getByLabelText('Nombre del Organismo'), 'Escuela 12');
    await user.type(screen.getByLabelText('Rubro'), 'Educación');
    await user.click(screen.getByRole('button', { name: 'Crear Organismo' }));

    expect(await screen.findByText('Servidor caído')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      (screen.getByLabelText('Nombre del Organismo') as HTMLInputElement).value,
    ).toBe('Escuela 12');
  });

  it('al cancelar descarta lo escrito', async () => {
    const user = renderDialog();
    await abrir(user);
    await user.type(screen.getByLabelText('Nombre del Organismo'), 'Borrador');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await abrir(user);
    expect(
      (screen.getByLabelText('Nombre del Organismo') as HTMLInputElement).value,
    ).toBe('');
  });
});
