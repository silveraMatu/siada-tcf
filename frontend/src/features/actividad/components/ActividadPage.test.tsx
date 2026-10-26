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
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exportarActividad, listarActividad } from '../api/actividad.api';
import { descargarBlob } from '../lib/descargar';
import type { EventoActividad, PaginaActividad } from '../types';
import { ActividadPage } from './ActividadPage';

vi.mock('../api/actividad.api', () => ({
  listarActividad: vi.fn(),
  exportarActividad: vi.fn(),
}));
vi.mock('../lib/descargar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/descargar')>()),
  descargarBlob: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// El Select de Radix no es fiable en jsdom: se lo reemplaza por un <select> nativo con la misma interfaz.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (valor: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
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

const evento = (
  id: number,
  extra: Partial<EventoActividad> = {},
): EventoActividad => ({
  id,
  ocurridoEn: '2026-10-26T15:30:00.000Z',
  accion: 'CUENTA_PRESENTADA',
  resultado: 'EXITO',
  codigoHttp: 200,
  usuarioId: 4,
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30123456',
  roles: ['RESPONSABLE'],
  ip: '10.0.0.5',
  userAgent: 'Mozilla/5.0',
  requestId: 'req-1',
  entidadTipo: 'CUENTA_MENSUAL',
  entidadId: 147,
  organismoId: 3,
  cuentaMensualId: 147,
  detalle: null,
  ...extra,
});

const pagina = (
  eventos: EventoActividad[],
  siguienteCursor: number | null = null,
): PaginaActividad => ({ eventos, siguienteCursor });

function renderPagina() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ActividadPage />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.mocked(listarActividad).mockResolvedValue(pagina([evento(2), evento(1)]));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ActividadPage', () => {
  it('lista los eventos con usuario, acción, resultado y entidad', async () => {
    renderPagina();

    const filas = await screen.findAllByRole('row');
    const primera = filas[1];
    expect(within(primera).getByText('Pérez, Ana')).toBeTruthy();
    expect(within(primera).getByText('DNI 30123456')).toBeTruthy();
    expect(within(primera).getByText('Rendición presentada')).toBeTruthy();
    expect(within(primera).getByText('Éxito')).toBeTruthy();
    expect(within(primera).getByText('Rendición #147')).toBeTruthy();
    expect(screen.getByText('2 eventos en total')).toBeTruthy();
    // sin más páginas no hay «Cargar más»
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
  });

  it('un login fallido no tiene usuario pero muestra el email que se probó', async () => {
    vi.mocked(listarActividad).mockResolvedValue(
      pagina([
        evento(9, {
          accion: 'LOGIN',
          resultado: 'DENEGADO',
          codigoHttp: 401,
          usuarioId: null,
          nombre: null,
          apellido: null,
          dni: null,
          detalle: { email: 'intruso@correo.com' },
        }),
      ]),
    );
    renderPagina();

    expect(await screen.findByText('Sin identificar')).toBeTruthy();
    expect(screen.getByText('intruso@correo.com')).toBeTruthy();
    // «Denegado» también es una opción del filtro: se busca dentro de la fila
    expect(
      within(screen.getAllByRole('row')[1]).getByText('Denegado'),
    ).toBeTruthy();
  });

  it('«Cargar más» pide la página siguiente con el cursor y suma los eventos', async () => {
    vi.mocked(listarActividad)
      .mockResolvedValueOnce(pagina([evento(30)], 30))
      .mockResolvedValueOnce(pagina([evento(20)], null));
    const user = renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Cargar más' }));

    await waitFor(() =>
      expect(screen.getByText('2 eventos en total')).toBeTruthy(),
    );
    expect(vi.mocked(listarActividad).mock.calls[1][1]).toBe(30);
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
  });

  it('cada fila se despliega con el detalle técnico', async () => {
    const user = renderPagina();
    await screen.findAllByRole('row');

    const boton = screen.getAllByRole('button', { name: /Ver el detalle/ })[0];
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    await user.click(boton);

    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('10.0.0.5')).toBeTruthy();
    expect(screen.getByText('req-1')).toBeTruthy();
    expect(screen.getByText('RESPONSABLE')).toBeTruthy();
  });

  it('«Aplicar» consulta con los filtros y «Limpiar» vuelve a todo', async () => {
    const user = renderPagina();
    await screen.findAllByRole('row');

    await user.type(screen.getByLabelText('DNI del usuario'), '30.123.456');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(vi.mocked(listarActividad).mock.calls.at(-1)?.[0]).toEqual({
        dni: '30123456',
      }),
    );
    expect(await screen.findByText(/con los filtros aplicados/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    await waitFor(() =>
      expect(vi.mocked(listarActividad).mock.calls.at(-1)?.[0]).toEqual({}),
    );
  });

  it('un filtro inválido se avisa y no consulta', async () => {
    const user = renderPagina();
    await screen.findAllByRole('row');
    const consultas = vi.mocked(listarActividad).mock.calls.length;

    await user.type(screen.getByLabelText('DNI del usuario'), '12');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'El DNI debe tener 7 u 8 dígitos',
    );
    expect(vi.mocked(listarActividad).mock.calls).toHaveLength(consultas);
  });

  it('sin eventos con filtros dice que ninguno coincide', async () => {
    const user = renderPagina();
    await screen.findAllByRole('row');
    vi.mocked(listarActividad).mockResolvedValue(pagina([]));

    await user.type(screen.getByLabelText('DNI del usuario'), '30123456');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(
      await screen.findByText('Ninguna actividad coincide con los filtros'),
    ).toBeTruthy();
  });

  it('«Exportar CSV» baja el archivo con los filtros vigentes y avisa que queda registrado', async () => {
    const csv = new Blob(['id;accion'], { type: 'text/csv' });
    vi.mocked(exportarActividad).mockResolvedValue(csv);
    const user = renderPagina();
    await screen.findAllByRole('row');

    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() => expect(descargarBlob).toHaveBeenCalledTimes(1));
    expect(vi.mocked(exportarActividad).mock.calls[0][0]).toEqual({});
    expect(vi.mocked(descargarBlob).mock.calls[0][0]).toBe(csv);
    expect(vi.mocked(descargarBlob).mock.calls[0][1]).toMatch(
      /^bitacora-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('registrada en la bitácora'),
    );
  });
});
