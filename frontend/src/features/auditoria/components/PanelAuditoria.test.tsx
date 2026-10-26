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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerIngresosEgresos } from '@/features/ingresos-egresos/api/ingresos-egresos.api';
import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
import { obtenerLibrosBanco } from '@/features/libro-banco/api/libro-banco.api';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import { auditarRendicion, obtenerEjecucion } from '../api/auditoria.api';
import { MOCK_EJECUCION, MOCK_RESULTADOS } from '../mocks/resultados.mock';
import type { Ejecucion, ResultadoValidacion } from '../types/auditoria.types';
import { PanelAuditoria } from './PanelAuditoria';

vi.mock('../api/auditoria.api', () => ({
  auditarRendicion: vi.fn(),
  obtenerEjecucion: vi.fn(),
}));
vi.mock('@/features/ingresos-egresos/api/ingresos-egresos.api', () => ({
  obtenerIngresosEgresos: vi.fn(),
  ingestarIngresosEgresos: vi.fn(),
}));
vi.mock('@/features/libro-banco/api/libro-banco.api', () => ({
  obtenerLibrosBanco: vi.fn(),
  ingestarLibroBanco: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

function renderPanel(
  estadoCuenta = 'LISTO_PARA_AUDITAR',
  onVerEnLibro = vi.fn(),
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PanelAuditoria
        cuentaMensualId={5}
        estadoCuenta={estadoCuenta}
        onVerEnLibro={onVerEnLibro}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onVerEnLibro, client };
}

const reglas = () => screen.findAllByRole('heading', { level: 3 });

beforeEach(() => {
  vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
  vi.mocked(obtenerLibrosBanco).mockResolvedValue(GUARDADOS);
  vi.mocked(obtenerEjecucion).mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PanelAuditoria', () => {
  describe('rendición sin auditar', () => {
    it('invita a auditar, no corre nada solo y el scorecard está en blanco', async () => {
      renderPanel();

      expect(
        await screen.findByText('Todavía no se auditó esta rendición'),
      ).toBeTruthy();
      expect(auditarRendicion).not.toHaveBeenCalled();
      const grupo = screen.getByRole('group', {
        name: 'Filtrar las reglas por resultado',
      });
      expect(within(grupo).getAllByText('—')).toHaveLength(3);
      for (const tarjeta of within(grupo).getAllByRole('button')) {
        expect((tarjeta as HTMLButtonElement).disabled).toBe(true);
      }
    });

    it('«Auditar rendición» pide confirmación y no audita si se cancela', async () => {
      const { user } = renderPanel();

      await user.click(
        await screen.findByRole('button', { name: 'Auditar rendición' }),
      );
      expect(await screen.findByText('¿Auditar esta rendición?')).toBeTruthy();
      expect(screen.getByText(/queda a su cargo/)).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(auditarRendicion).not.toHaveBeenCalled();
    });

    it('al confirmar audita, recarga la ejecución guardada y muestra las reglas', async () => {
      vi.mocked(auditarRendicion).mockResolvedValue(MOCK_RESULTADOS);
      vi.mocked(obtenerEjecucion)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(MOCK_EJECUCION);
      const { user } = renderPanel();

      await user.click(
        await screen.findByRole('button', { name: 'Auditar rendición' }),
      );
      await user.click(await screen.findByRole('button', { name: 'Auditar' }));

      expect(await reglas()).toHaveLength(3);
      expect(auditarRendicion).toHaveBeenCalledWith(5);
      expect(
        screen.getByText(/Auditada el .* por Luis Gómez · reglas v1/),
      ).toBeTruthy();
      // el botón desaparece: repetirlo no hace falta (es idempotente)
      expect(
        screen.queryByRole('button', { name: 'Auditar rendición' }),
      ).toBeNull();
      expect(screen.getByRole('status').textContent).toMatch(
        /ya puede revisar/,
      );
    });

    it('un error del servidor se avisa y el botón sigue disponible', async () => {
      vi.mocked(auditarRendicion).mockRejectedValue(
        new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
          status: 409,
          data: { message: 'La rendición todavía no fue presentada' },
        } as AxiosResponse),
      );
      const { user } = renderPanel();

      await user.click(
        await screen.findByRole('button', { name: 'Auditar rendición' }),
      );
      await user.click(await screen.findByRole('button', { name: 'Auditar' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          'La rendición todavía no fue presentada',
        ),
      );
      expect(
        screen.getByRole('button', { name: 'Auditar rendición' }),
      ).toBeTruthy();
    });

    it('una rendición en borrador no se puede auditar y lo explica', async () => {
      renderPanel('EN_BORRADOR');

      expect(await screen.findByText('Todavía no fue presentada')).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Auditar rendición' }),
      ).toBeNull();
    });
  });

  describe('con la ejecución guardada', () => {
    beforeEach(() => {
      vi.mocked(obtenerEjecucion).mockResolvedValue(MOCK_EJECUCION);
    });

    it('la carga al abrir sin volver a auditar: scorecard y reglas plegadas por código', async () => {
      renderPanel('EN_AUDITORIA');

      const titulos = await reglas();
      expect(titulos.map((h) => h.textContent)).toEqual([
        expect.stringContaining('Fechas dentro del período'),
        expect.stringContaining('Saldo de cuenta'),
        expect.stringContaining('Cruce con ingresos y egresos'),
      ]);
      expect(obtenerEjecucion).toHaveBeenCalledWith(5);
      expect(auditarRendicion).not.toHaveBeenCalled();
      const grupo = screen.getByRole('group', {
        name: 'Filtrar las reglas por resultado',
      });
      expect(
        within(grupo).getByRole('button', {
          name: /Fallidas\s*1\s*1 observación/,
        }),
      ).toBeTruthy();
      expect(screen.queryByRole('table')).toBeNull();
      // ya no hay nada que ejecutar de nuevo
      expect(
        screen.queryByRole('button', { name: /Auditar rendición/ }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: /Volver a ejecutar/ }),
      ).toBeNull();
    });

    it('las observaciones se ubican con los libros guardados: fila, libro y botón para ir a ella', async () => {
      const { user, onVerEnLibro } = renderPanel('EN_AUDITORIA');

      await user.click(
        await screen.findByRole('button', { name: /Saldo de cuenta/ }),
      );
      await user.click(
        await screen.findByRole('button', {
          name: 'Ver la fila 3 de Cta. Cte. 200/2 en el libro',
        }),
      );

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
      vi.mocked(obtenerEjecucion).mockResolvedValue({
        ...MOCK_EJECUCION,
        resultados: [fallaV1],
      } satisfies Ejecucion);
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
      const { user, onVerEnLibro } = renderPanel('EN_AUDITORIA');

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
      vi.mocked(obtenerEjecucion).mockResolvedValue({
        ...MOCK_EJECUCION,
        resultados: [MOCK_RESULTADOS[1]],
      });
      renderPanel('EN_AUDITORIA');

      await reglas();

      expect(obtenerLibrosBanco).not.toHaveBeenCalled();
    });

    it('las tarjetas del scorecard filtran las reglas y un segundo clic quita el filtro', async () => {
      const { user } = renderPanel('EN_AUDITORIA');
      await reglas();

      const fallidas = screen.getByRole('button', { name: /Fallidas/ });
      await user.click(fallidas);

      expect(fallidas.getAttribute('aria-pressed')).toBe('true');
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
      expect(
        screen.getByText(/Mostrando solo las reglas fallidas/),
      ).toBeTruthy();

      await user.click(fallidas);
      expect(fallidas.getAttribute('aria-pressed')).toBe('false');
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    });

    it('«Quitar filtro» vuelve a mostrar todas', async () => {
      const { user } = renderPanel('EN_AUDITORIA');
      await reglas();
      await user.click(screen.getByRole('button', { name: /Omitidas/ }));

      await user.click(screen.getByRole('button', { name: 'Quitar filtro' }));

      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    });
  });

  it('mientras carga la ejecución muestra un esqueleto y avisa que está ocupado', () => {
    vi.mocked(obtenerEjecucion).mockReturnValue(new Promise(() => {}));
    renderPanel();

    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Auditar rendición' }),
    ).toBeNull();
  });

  it('si no se puede cargar, avisa con el mensaje del servidor y permite reintentar', async () => {
    vi.mocked(obtenerEjecucion)
      .mockRejectedValueOnce(
        new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
          status: 403,
          data: {
            message:
              'La Cuenta Mensual no pertenece a un organismo al que tenga acceso.',
          },
        } as AxiosResponse),
      )
      .mockResolvedValue(MOCK_EJECUCION);
    const { user } = renderPanel('EN_AUDITORIA');

    expect(
      await screen.findByText(
        /no pertenece a un organismo al que tenga acceso/,
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await reglas()).toHaveLength(3);
  });
});
