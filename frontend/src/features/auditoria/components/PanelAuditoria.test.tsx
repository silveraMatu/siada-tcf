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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerIngresosEgresos } from '@/features/ingresos-egresos/api/ingresos-egresos.api';
import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
import { obtenerLibrosBanco } from '@/features/libro-banco/api/libro-banco.api';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import { ejecutarValidaciones } from '../api/auditoria.api';
import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import type { ResultadoValidacion } from '../types/auditoria.types';
import { PanelAuditoria } from './PanelAuditoria';

vi.mock('../api/auditoria.api', () => ({ ejecutarValidaciones: vi.fn() }));
vi.mock('@/features/ingresos-egresos/api/ingresos-egresos.api', () => ({
  obtenerIngresosEgresos: vi.fn(),
  ingestarIngresosEgresos: vi.fn(),
}));
vi.mock('@/features/libro-banco/api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));

const transaccion = (id: number) => ({
  id,
  fecha: '2026-03-02',
  cheque: null,
  aLaOrdenDe: 'Proveedor',
  depositos: 0,
  retiro: 0,
  saldo: 0,
});
// la observación de MOCK_RESULTADOS apunta a la transacción 12, la tercera fila
const GUARDADOS: LibroBancoGuardado[] = [
  {
    id: 2,
    cuentaMensualId: 5,
    numeroCuentaCte: '200/2',
    fechaCreacion: '2026-10-15T12:00:00.000Z',
    transacciones: [transaccion(10), transaccion(11), transaccion(12)],
  },
];

function renderPanel(onVerEnLibro = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PanelAuditoria cuentaMensualId={5} onVerEnLibro={onVerEnLibro} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onVerEnLibro, client };
}

const botonEjecutar = () =>
  screen.getByRole('button', { name: 'Ejecutar Validaciones Determinísticas' });

beforeEach(() => {
  vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PanelAuditoria', () => {
  it('antes de ejecutar invita a hacerlo, no corre nada solo y el scorecard está en blanco', () => {
    renderPanel();

    expect(
      screen.getByText('Todavía no se ejecutaron las validaciones'),
    ).toBeTruthy();
    expect(ejecutarValidaciones).not.toHaveBeenCalled();
    const grupo = screen.getByRole('group', {
      name: 'Filtrar las reglas por resultado',
    });
    expect(within(grupo).getAllByText('—')).toHaveLength(3);
    for (const tarjeta of within(grupo).getAllByRole('button')) {
      expect((tarjeta as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('ejecutar muestra el scorecard y las reglas plegadas, ordenadas por código', async () => {
    vi.mocked(ejecutarValidaciones).mockResolvedValue(MOCK_RESULTADOS);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user } = renderPanel();

    await user.click(botonEjecutar());

    const reglas = await screen.findAllByRole('heading', { level: 3 });
    expect(reglas.map((h) => h.textContent)).toEqual([
      expect.stringContaining('Fechas dentro del período'),
      expect.stringContaining('Saldo de cuenta'),
      expect.stringContaining('Cruce con ingresos y egresos'),
    ]);
    expect(ejecutarValidaciones).toHaveBeenCalledWith(5);
    const grupo = screen.getByRole('group', {
      name: 'Filtrar las reglas por resultado',
    });
    expect(
      within(grupo).getByRole('button', {
        name: /Fallidas\s*1\s*1 observación/,
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Volver a ejecutar validaciones' }),
    ).toBeTruthy();
    expect(screen.getByText(/Última ejecución: \d{2}:\d{2}/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Validaciones completadas: 1 verificadas, 1 fallidas, 1 omitidas.',
    );
  });

  it('las observaciones se ubican con los libros guardados: fila, libro y botón para ir a ella', async () => {
    vi.mocked(ejecutarValidaciones).mockResolvedValue(MOCK_RESULTADOS);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user, onVerEnLibro } = renderPanel();
    await user.click(botonEjecutar());

    await user.click(
      await screen.findByRole('button', { name: /Saldo de cuenta/ }),
    );
    const boton = await screen.findByRole('button', {
      name: 'Ver la fila 3 de Cta. Cte. 200/2 en el libro',
    });
    await user.click(boton);

    expect(onVerEnLibro).toHaveBeenCalledWith(
      expect.objectContaining({
        libroTipo: 'LIBRO_BANCO',
        libroId: 2,
        transaccionId: 12,
        fila: 3,
      }),
    );
  });

  it('un hallazgo del libro de Ingresos y Egresos se ubica por la fila del archivo y lleva a ese libro', async () => {
    const fallaV1: ResultadoValidacion = {
      codigoRegla: 'V1',
      descripcion: 'Saldo de caja',
      estado: 'FALLO',
      observaciones: [
        {
          ...MOCK_RESULTADOS[0].observaciones[0],
          id: 31,
          codigoRegla: 'V1',
          descripcion: 'Error de fórmula en la fila 9: el saldo no coincide.',
          libroOrigen: 'INGRESOS_EGRESOS',
          transaccionId: null,
          transaccionIngresoEgresoId: 58,
        },
      ],
      filasEvaluadas: 3,
      librosFaltantes: [],
    };
    vi.mocked(ejecutarValidaciones).mockResolvedValue([fallaV1]);
    vi.mocked(obtenerIngresosEgresos).mockResolvedValue({
      id: 2,
      cuentaMensualId: 5,
      numeroCuentaCte: null,
      fechaCreacion: '2026-10-15T12:00:00.000Z',
      transacciones: [
        { id: 57, fila: 4 },
        { id: 58, fila: 9 },
      ],
    } as unknown as IngresosEgresosGuardado);
    const { user, onVerEnLibro } = renderPanel();
    await user.click(botonEjecutar());

    await user.click(
      await screen.findByRole('button', { name: /Saldo de caja/ }),
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'Ver la fila 9 de Ingresos y Egresos en el libro',
      }),
    );

    expect(onVerEnLibro).toHaveBeenCalledWith(
      expect.objectContaining({
        libroTipo: 'INGRESOS_EGRESOS',
        libroId: 2,
        transaccionId: 58,
        fila: 9,
      }),
    );
  });

  it('sin reglas fallidas no se piden las filas de los libros', async () => {
    vi.mocked(ejecutarValidaciones).mockResolvedValue([MOCK_RESULTADOS[1]]);
    const { user } = renderPanel();

    await user.click(botonEjecutar());
    await screen.findByRole('heading', { level: 3 });

    expect(obtenerLibrosBanco).not.toHaveBeenCalled();
  });

  it('las tarjetas del scorecard filtran las reglas y un segundo clic quita el filtro', async () => {
    vi.mocked(ejecutarValidaciones).mockResolvedValue(MOCK_RESULTADOS);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user } = renderPanel();
    await user.click(botonEjecutar());
    await screen.findAllByRole('heading', { level: 3 });

    const fallidas = screen.getByRole('button', { name: /Fallidas/ });
    await user.click(fallidas);

    expect(fallidas.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(screen.getByText(/Mostrando solo las reglas fallidas/)).toBeTruthy();

    await user.click(fallidas);
    expect(fallidas.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('«Quitar filtro» vuelve a mostrar todas', async () => {
    vi.mocked(ejecutarValidaciones).mockResolvedValue(MOCK_RESULTADOS);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user } = renderPanel();
    await user.click(botonEjecutar());
    await screen.findAllByRole('heading', { level: 3 });
    await user.click(screen.getByRole('button', { name: /Omitidas/ }));

    await user.click(screen.getByRole('button', { name: 'Quitar filtro' }));

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('mientras corre deshabilita el botón y avisa que está ocupado', async () => {
    let resolver: (valor: typeof MOCK_RESULTADOS) => void = () => {};
    vi.mocked(ejecutarValidaciones).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user } = renderPanel();

    await user.click(botonEjecutar());

    const ocupado = await screen.findByRole('button', { name: 'Ejecutando…' });
    expect((ocupado as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();

    resolver(MOCK_RESULTADOS);
    await screen.findAllByRole('heading', { level: 3 });
  });

  it('si falla, avisa con la opción de reintentar y reintenta', async () => {
    vi.mocked(ejecutarValidaciones)
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce(MOCK_RESULTADOS);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user } = renderPanel();

    await user.click(botonEjecutar());
    expect(await screen.findByText('Sin conexión')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3),
    );
    expect(screen.queryByText('Sin conexión')).toBeNull();
  });

  it('volver a ejecutar reemplaza el resultado anterior', async () => {
    vi.mocked(ejecutarValidaciones)
      .mockResolvedValueOnce(MOCK_RESULTADOS)
      .mockResolvedValueOnce([MOCK_RESULTADOS[1]]);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const { user } = renderPanel();
    await user.click(botonEjecutar());
    await screen.findAllByRole('heading', { level: 3 });

    await user.click(
      screen.getByRole('button', { name: 'Volver a ejecutar validaciones' }),
    );

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1),
    );
  });

  it('el resultado se conserva en la sesión: al volver a montar la vista sigue ahí', async () => {
    vi.mocked(ejecutarValidaciones).mockResolvedValue(MOCK_RESULTADOS);
    vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const vista = () => (
      <QueryClientProvider client={client}>
        <PanelAuditoria cuentaMensualId={5} onVerEnLibro={vi.fn()} />
      </QueryClientProvider>
    );
    const primera = render(vista());
    await userEvent.setup().click(botonEjecutar());
    await screen.findAllByRole('heading', { level: 3 });
    primera.unmount();

    render(vista());

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(ejecutarValidaciones).toHaveBeenCalledTimes(1);
  });
});
