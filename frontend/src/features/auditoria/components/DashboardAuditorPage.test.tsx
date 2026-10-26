// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { listarCuentasMensuales } from '@/features/cuentas/api/cuentas.api';
import type {
  CuentaMensualListada,
  ResumenLibro,
} from '@/features/cuentas/types';
import { obtenerLibrosBanco } from '@/features/libro-banco/api/libro-banco.api';
import { DashboardAuditorPage } from './DashboardAuditorPage';

vi.mock('@/features/cuentas/api/cuentas.api', () => ({
  listarCuentasMensuales: vi.fn(),
}));
vi.mock('@/features/libro-banco/api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));

const libro = (
  id: number,
  numeroCuentaCte: string | null,
  cantidadTransacciones: number,
  fechaDesde: string | null,
  fechaHasta: string | null,
): ResumenLibro => ({
  id,
  tipo: 'LIBRO_BANCO',
  numeroCuentaCte,
  cantidadTransacciones,
  fechaDesde,
  fechaHasta,
});

const cuenta = (
  id: number,
  organismoId: number,
  organismoNombre: string,
  mes: number,
  ejercicioFiscal: number,
  libros: ResumenLibro[] = [],
): CuentaMensualListada => ({
  id,
  mes,
  cuentaAnualId: 1,
  estado: 'LISTO_PARA_AUDITAR',
  fechaCreacion: '2026-10-15T12:00:00.000Z',
  organismoId,
  organismoNombre,
  ejercicioFiscal,
  libros,
});

function renderPagina() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardAuditorPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

type Usuario = ReturnType<typeof userEvent.setup>;

/** Abre (o cierra) el desplegable cuyo botón se llama así: un organismo o una rendición mensual. */
async function alternar(user: Usuario, nombre: string | RegExp) {
  await user.click(await screen.findByRole('button', { name: nombre }));
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardAuditorPage', () => {
  it('pide todas las cuentas que ve el auditor, sin filtrar por estado: las pestañas las reparten', async () => {
    vi.mocked(listarCuentasMensuales).mockResolvedValue([
      cuenta(7, 1, 'Municipalidad de Pirané', 3, 2026),
    ]);
    renderPagina();

    await screen.findByText('Municipalidad de Pirané');
    expect(vi.mocked(listarCuentasMensuales).mock.calls[0][0]).toBeUndefined();
  });

  describe('pestañas por estado', () => {
    const enEstado = (
      id: number,
      estado: string,
      organismo = 'Hospital Central',
    ) => ({
      ...cuenta(id, 1, organismo, 3, 2026),
      estado,
    });

    it('reparte las rendiciones en «Para auditar», «En curso» y «Cerradas» con su cantidad', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        enEstado(1, 'LISTO_PARA_AUDITAR'),
        enEstado(2, 'EN_AUDITORIA'),
        enEstado(3, 'AUDITADA'),
        enEstado(4, 'CON_OBSERVACIONES'),
        enEstado(5, 'EN_BORRADOR'),
      ]);
      renderPagina();

      expect(
        await screen.findByRole('tab', { name: /Para auditar\s*1/ }),
      ).toBeTruthy();
      expect(screen.getByRole('tab', { name: /En curso\s*1/ })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /Cerradas\s*2/ })).toBeTruthy();
    });

    it('abre en la primera pestaña que tiene rendiciones y cada una ofrece su acción', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        enEstado(2, 'EN_AUDITORIA'),
        enEstado(3, 'AUDITADA', 'Escuela 12'),
      ]);
      const user = renderPagina();

      // «Para auditar» está vacía: se arranca en «En curso»
      expect(
        (await screen.findByRole('tab', { name: /En curso/ })).getAttribute(
          'aria-selected',
        ),
      ).toBe('true');
      // con un solo organismo el bloque ya está abierto
      expect(
        screen.getByRole('link', {
          name: /Continuar auditoría de Hospital Central/,
        }),
      ).toBeTruthy();
      expect(
        screen.getByText('1 auditoría en curso en 1 organismo'),
      ).toBeTruthy();

      await user.click(screen.getByRole('tab', { name: /Cerradas/ }));
      expect(
        await screen.findByRole('link', {
          name: /Ver auditoría de Escuela 12/,
        }),
      ).toBeTruthy();
      expect(screen.getByText('Auditada')).toBeTruthy();
    });

    it('una pestaña sin rendiciones lo dice con su propio mensaje', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        enEstado(1, 'LISTO_PARA_AUDITAR'),
      ]);
      const user = renderPagina();

      await user.click(await screen.findByRole('tab', { name: /En curso/ }));

      expect(
        await screen.findByText('No hay auditorías en curso'),
      ).toBeTruthy();
    });
  });

  describe('agrupado por organismo', () => {
    const datos = () => [
      cuenta(7, 1, 'Municipalidad de Pirané', 3, 2026, [
        libro(1, '100234/1', 10, '2026-03-01', '2026-03-28'),
      ]),
      cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
        libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
        libro(3, '100234/2', 4, '2026-04-02', '2026-04-02'),
      ]),
      cuenta(9, 2, 'Comisión de Fomento', 12, 2025, [
        libro(4, '555/1', 8, null, null),
      ]),
    ];

    it('muestra un bloque por organismo, en orden alfabético, sin repetir su nombre', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue(datos());
      renderPagina();

      await screen.findByText('Municipalidad de Pirané');
      const organismos = screen
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent);
      expect(organismos).toEqual([
        'Comisión de Fomento',
        'Municipalidad de Pirané',
      ]);
      expect(screen.getAllByText('Municipalidad de Pirané')).toHaveLength(1);
    });

    it('cada organismo dice cuántas rendiciones y libros esconde, y el panel cuántas hay', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue(datos());
      renderPagina();

      await screen.findByText('Municipalidad de Pirané');
      expect(
        screen.getByText('2 rendiciones pendientes · 3 libros'),
      ).toBeTruthy();
      expect(screen.getByText('1 rendición pendiente · 1 libro')).toBeTruthy();
      expect(
        screen.getByText('3 rendiciones esperando auditoría en 2 organismos'),
      ).toBeTruthy();
    });

    it('dentro de cada organismo ordena las rendiciones de la más nueva a la más vieja', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue(datos());
      const user = renderPagina();
      await alternar(user, 'Municipalidad de Pirané');

      const bloque = await screen.findByRole('region', {
        name: 'Municipalidad de Pirané',
      });
      const periodos = within(bloque)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent);
      expect(periodos).toEqual(['Abril 2026', 'Marzo 2026']);
    });

    it('cada rendición tiene un único botón para auditarla', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue(datos());
      const user = renderPagina();
      await alternar(user, 'Municipalidad de Pirané');
      await alternar(user, 'Comisión de Fomento');

      const enlace = await screen.findByRole('link', {
        name: /Auditar Rendición de Municipalidad de Pirané, Abril 2026/,
      });
      expect(enlace.getAttribute('href')).toBe('/auditoria/cuenta/8');
      expect(
        screen.getAllByRole('link', { name: /Auditar Rendición/ }),
      ).toHaveLength(3);
    });
  });

  describe('desplegables', () => {
    const dosOrganismos = () => [
      cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
        libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
      ]),
      cuenta(9, 2, 'Comisión de Fomento', 12, 2025, []),
    ];

    it('con varios organismos arrancan todos cerrados, sin rendiciones a la vista', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue(dosOrganismos());
      renderPagina();

      const boton = await screen.findByRole('button', {
        name: 'Municipalidad de Pirané',
      });
      expect(boton.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByText('Abril 2026')).toBeNull();
      expect(
        screen.queryByRole('link', { name: /Auditar Rendición/ }),
      ).toBeNull();
    });

    it('un organismo se abre y se vuelve a cerrar', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue(dosOrganismos());
      const user = renderPagina();

      await alternar(user, 'Municipalidad de Pirané');
      expect(
        screen
          .getByRole('button', { name: 'Municipalidad de Pirané' })
          .getAttribute('aria-expanded'),
      ).toBe('true');
      expect(screen.getByText('Abril 2026')).toBeTruthy();

      await alternar(user, 'Municipalidad de Pirané');
      expect(screen.queryByText('Abril 2026')).toBeNull();
    });

    it('con un solo organismo se muestra abierto, con sus rendiciones cerradas', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
        ]),
      ]);
      renderPagina();

      expect(await screen.findByText('Abril 2026')).toBeTruthy();
      expect(
        screen
          .getByRole('button', { name: 'Municipalidad de Pirané' })
          .getAttribute('aria-expanded'),
      ).toBe('true');
      expect(
        screen
          .getByRole('button', { name: 'Abril 2026' })
          .getAttribute('aria-expanded'),
      ).toBe('false');
    });

    it('la rendición cerrada ya muestra cuántos libros trae y su botón de auditar', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
          libro(3, '100234/2', 4, null, null),
        ]),
      ]);
      renderPagina();

      expect(await screen.findByText('2 libros cargados')).toBeTruthy();
      expect(
        screen.getByRole('link', { name: /Auditar Rendición de .*Abril 2026/ }),
      ).toBeTruthy();
      expect(screen.queryByText('Cta. Cte. 100234/1')).toBeNull();
    });

    it('la rendición se abre a pedido para ver sus libros y se vuelve a cerrar', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
        ]),
      ]);
      const user = renderPagina();

      await alternar(user, 'Abril 2026');
      expect(await screen.findByText('Cta. Cte. 100234/1')).toBeTruthy();

      await alternar(user, 'Abril 2026');
      expect(screen.queryByText('Cta. Cte. 100234/1')).toBeNull();
    });

    it('auditar no abre ni cierra el desplegable: es un enlace aparte', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
        ]),
      ]);
      renderPagina();

      const enlace = await screen.findByRole('link', {
        name: /Auditar Rendición de .*Abril 2026/,
      });

      expect(enlace.getAttribute('href')).toBe('/auditoria/cuenta/8');
      expect(
        screen.getByRole('button', { name: 'Abril 2026' }).contains(enlace),
      ).toBe(false);
    });
  });

  describe('resumen de los libros de cada rendición', () => {
    it('lista cada libro con su N° de cuenta, cantidad de transacciones y fechas', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, '100234/1', 10, '2026-03-01', '2026-03-28'),
          libro(3, '100234/2', 1, '2026-04-02', '2026-04-02'),
        ]),
      ]);
      const user = renderPagina();
      await alternar(user, 'Abril 2026');

      const libros = await screen.findByRole('list', {
        name: 'Libros de Abril 2026',
      });
      const filas = within(libros).getAllByRole('listitem');
      expect(filas).toHaveLength(2);
      expect(within(filas[0]).getByText('Libro Banco')).toBeTruthy();
      expect(within(filas[0]).getByText('Cta. Cte. 100234/1')).toBeTruthy();
      expect(
        within(filas[0]).getByText(
          '10 transacciones · 01/03/2026 al 28/03/2026',
        ),
      ).toBeTruthy();
      expect(within(filas[1]).getByText('Cta. Cte. 100234/2')).toBeTruthy();
      expect(
        within(filas[1]).getByText('1 transacción · 02/04/2026'),
      ).toBeTruthy();
      expect(screen.getByText('2 libros cargados')).toBeTruthy();
    });

    it('al clicar el nombre de un libro se abre su pestaña con las transacciones, que se piden recién entonces', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, '100234/1', 1, '2026-03-02', '2026-03-02'),
        ]),
      ]);
      vi.mocked(obtenerLibrosBanco).mockResolvedValue([
        {
          id: 2,
          cuentaMensualId: 8,
          numeroCuentaCte: '100234/1',
          fechaCreacion: '2026-10-15T12:00:00.000Z',
          transacciones: [
            {
              id: 20,
              fecha: '2026-03-02',
              cheque: 'CH-001',
              aLaOrdenDe: 'Proveedor SA',
              depositos: 0,
              retiro: 15000,
              saldo: 85000,
            },
          ],
        },
      ]);
      const user = renderPagina();
      await alternar(user, 'Abril 2026');
      // abrir la rendición solo muestra el resumen: todavía no se pidieron las transacciones
      expect(obtenerLibrosBanco).not.toHaveBeenCalled();

      await user.click(
        await screen.findByRole('button', { name: 'Cta. Cte. 100234/1' }),
      );

      expect(await screen.findByText('Proveedor SA')).toBeTruthy();
      expect(obtenerLibrosBanco).toHaveBeenCalledWith(8);
      expect(
        screen
          .getByRole('tab', { name: 'Cta. Cte. 100234/1' })
          .getAttribute('aria-selected'),
      ).toBe('true');
      expect(screen.getByText('CH-001')).toBeTruthy();
    });

    it('un libro sin fechas o sin N° de cuenta se muestra igual', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, [
          libro(2, null, 3, null, null),
        ]),
      ]);
      const user = renderPagina();
      await alternar(user, 'Abril 2026');

      expect(await screen.findByText('Sin N° de cuenta')).toBeTruthy();
      expect(screen.getByText('3 transacciones · Sin fechas')).toBeTruthy();
      expect(screen.getByText('1 libro cargado')).toBeTruthy();
    });

    it('avisa si una rendición no trae libros', async () => {
      vi.mocked(listarCuentasMensuales).mockResolvedValue([
        cuenta(8, 1, 'Municipalidad de Pirané', 4, 2026, []),
      ]);
      const user = renderPagina();
      await alternar(user, 'Abril 2026');

      expect(
        await screen.findByText('Esta rendición no tiene libros cargados.'),
      ).toBeTruthy();
      expect(screen.getByText('0 libros cargados')).toBeTruthy();
    });
  });

  it('un auditor sin rendiciones ve que depende de los organismos que le asignan', async () => {
    useAuthStore.setState({
      token: 't',
      user: { sub: 1, email: 'a@b.gob.ar', roles: ['AUDITOR'] },
      isAuthenticated: true,
    });
    vi.mocked(listarCuentasMensuales).mockResolvedValue([]);
    renderPagina();

    expect(
      await screen.findByText('No hay rendiciones para auditar'),
    ).toBeTruthy();
    expect(screen.getByText(/le asignó el juez de trámite/)).toBeTruthy();
  });

  it('el administrador sin rendiciones ve el mensaje general', async () => {
    useAuthStore.setState({
      token: 't',
      user: { sub: 1, email: 'a@b.gob.ar', roles: ['ADMIN'] },
      isAuthenticated: true,
    });
    vi.mocked(listarCuentasMensuales).mockResolvedValue([]);
    renderPagina();

    expect(
      await screen.findByText(
        'Cuando un responsable presente una rendición, aparecerá acá.',
      ),
    ).toBeTruthy();
  });

  it('muestra el error del servidor con la opción de reintentar', async () => {
    vi.mocked(listarCuentasMensuales).mockRejectedValue(
      new Error('Sin conexión'),
    );
    renderPagina();

    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});
