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
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/features/auth/hooks/useAuth';
import type { Rol } from '@/features/usuarios/types';
import {
  asignarAuditor,
  obtenerAuditores,
  obtenerOrganismos,
  quitarAuditor,
} from '../api/organismos.api';
import type { Auditor, Organismo } from '../types';
import { AsignacionAuditoresPage } from './AsignacionAuditoresPage';

vi.mock('../api/organismos.api', () => ({
  obtenerOrganismos: vi.fn(),
  obtenerAuditores: vi.fn(),
  asignarAuditor: vi.fn(),
  quitarAuditor: vi.fn(),
  crearOrganismo: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// El Select de Radix no es fiable en jsdom: se lo reemplaza por un <select> nativo con la misma interfaz.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (valor: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Auditor"
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="">Seleccione un auditor</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

const organismo = (
  id: number,
  nombre: string,
  extra: Partial<Organismo> = {},
): Organismo => ({
  id,
  nombre,
  rubro: 'Municipio',
  active: true,
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  auditorId: null,
  auditor: null,
  ...extra,
});

const auditor = (id: number, nombre: string, apellido: string): Auditor => ({
  id,
  nombre,
  apellido,
  email: `${nombre.toLowerCase()}@tribunal.gob.ar`,
});

function renderPagina(roles: Rol[] = ['JUEZ_TRAMITE']) {
  useAuthStore.setState({
    token: 'token',
    user: { sub: 1, email: 'j@b.gob.ar', roles },
    isAuthenticated: true,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AsignacionAuditoresPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const fila = (nombre: string) =>
  screen.getByText(nombre).closest('tr') as HTMLElement;

beforeEach(() => {
  vi.mocked(obtenerOrganismos).mockResolvedValue([
    organismo(1, 'Municipalidad de Pirané'),
    organismo(2, 'Hospital Central', {
      auditorId: 7,
      auditor: { id: 7, nombre: 'Lucía', apellido: 'Gómez' },
    }),
    organismo(3, 'Escuela 12', { active: false }),
  ]);
  vi.mocked(obtenerAuditores).mockResolvedValue([
    auditor(7, 'Lucía', 'Gómez'),
    auditor(8, 'Marcos', 'Ruiz'),
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AsignacionAuditoresPage', () => {
  it('lista cada organismo con su auditor y cuenta los activos que no tienen', async () => {
    renderPagina();

    expect(await screen.findByText('Municipalidad de Pirané')).toBeTruthy();
    expect(
      within(fila('Hospital Central')).getByText('Gómez, Lucía'),
    ).toBeTruthy();
    expect(
      within(fila('Municipalidad de Pirané')).getByText('Sin auditor'),
    ).toBeTruthy();
    expect(screen.getByText(/^3 organismos/)).toBeTruthy();
    expect(screen.getByText('1 activo sin auditor')).toBeTruthy();
  });

  it('un organismo sin auditor ofrece «Asignar» y uno con auditor, «Cambiar» y «Quitar»', async () => {
    renderPagina();
    await screen.findByText('Hospital Central');

    expect(
      screen.getByRole('button', {
        name: 'Asignar el auditor de Municipalidad de Pirané',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Cambiar el auditor de Hospital Central',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Quitar el auditor de Hospital Central',
      }),
    ).toBeTruthy();
  });

  it('un organismo inactivo no admite auditor', async () => {
    renderPagina();
    await screen.findByText('Escuela 12');

    const boton = screen.getByRole('button', {
      name: 'Asignar el auditor de Escuela 12',
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(boton.title).toBe('Un organismo inactivo no admite auditor');
  });

  it('asigna el auditor elegido y avisa', async () => {
    vi.mocked(asignarAuditor).mockResolvedValue(
      organismo(1, 'Municipalidad de Pirané'),
    );
    const user = renderPagina();
    await user.click(
      await screen.findByRole('button', {
        name: 'Asignar el auditor de Municipalidad de Pirané',
      }),
    );

    const dialogo = await screen.findByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', {
      name: 'Asignar auditor',
    }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    await user.selectOptions(within(dialogo).getByLabelText('Auditor'), '8');
    await user.click(confirmar);

    await waitFor(() => expect(asignarAuditor).toHaveBeenCalledWith(1, 8));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Marcos Ruiz audita ahora'),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('al cambiar no deja elegir al auditor que ya está', async () => {
    const user = renderPagina();
    await user.click(
      await screen.findByRole('button', {
        name: 'Cambiar el auditor de Hospital Central',
      }),
    );

    const dialogo = await screen.findByRole('dialog');
    await user.selectOptions(within(dialogo).getByLabelText('Auditor'), '7');

    expect(
      within(dialogo).getByText('Ya es el auditor de este organismo.'),
    ).toBeTruthy();
    expect(
      (
        within(dialogo).getByRole('button', {
          name: 'Cambiar auditor',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('quitar pide confirmación y no hace nada si se cancela', async () => {
    vi.mocked(quitarAuditor).mockResolvedValue(
      organismo(2, 'Hospital Central'),
    );
    const user = renderPagina();
    await user.click(
      await screen.findByRole('button', {
        name: 'Quitar el auditor de Hospital Central',
      }),
    );

    expect(await screen.findByText('¿Quitar el auditor?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(quitarAuditor).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', {
        name: 'Quitar el auditor de Hospital Central',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Quitar auditor' }));

    await waitFor(() => expect(quitarAuditor).toHaveBeenCalledWith(2));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('quedó sin auditor'),
    );
  });

  it('sin auditores disponibles lo avisa y, al administrador, le indica dónde habilitarlos', async () => {
    vi.mocked(obtenerAuditores).mockResolvedValue([]);
    renderPagina(['ADMIN']);

    expect(
      await screen.findByText(/No hay usuarios activos con el rol Auditor/),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /Solicitudes de acceso/ })
        .getAttribute('href'),
    ).toBe('/admin/usuarios');
  });

  it('un error del servidor al asignar se muestra con su mensaje', async () => {
    const { AxiosError } = await import('axios');
    vi.mocked(asignarAuditor).mockRejectedValue(
      new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { message: 'El organismo está inactivo' },
      } as never),
    );
    const user = renderPagina();
    await user.click(
      await screen.findByRole('button', {
        name: 'Asignar el auditor de Municipalidad de Pirané',
      }),
    );
    const dialogo = await screen.findByRole('dialog');
    await user.selectOptions(within(dialogo).getByLabelText('Auditor'), '8');
    await user.click(
      within(dialogo).getByRole('button', { name: 'Asignar auditor' }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('El organismo está inactivo'),
    );
    // el diálogo sigue abierto para reintentar o cancelar
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
