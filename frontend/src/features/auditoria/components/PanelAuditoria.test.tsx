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
import { obtenerRaci } from '@/features/raci/api/raci.api';
import { obtenerRai } from '@/features/rai/api/rai.api';
import type { RaiGuardado } from '@/features/rai/types';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import { auditarRendicion, obtenerEjecucion } from '../api/auditoria.api';
import { MOCK_EJECUCION, MOCK_RESULTADOS } from '../mocks/resultados.mock';
import type { RaciGuardado } from '@/features/raci/types';
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
vi.mock('@/features/rai/api/rai.api', () => ({
  obtenerRai: vi.fn(),
  ingestarRai: vi.fn(),
}));
vi.mock('@/features/raci/api/raci.api', () => ({
  obtenerRaci: vi.fn(),
  ingestarRaci: vi.fn(),
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
    subidoPorId: 1,
    subidoPor: null,
    hashContenido: 'a'.repeat(64),
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

const reglas = () => screen.findAllByRole('heading', { level: 4 });

beforeEach(() => {
  vi.mocked(obtenerIngresosEgresos).mockResolvedValue(null);
  vi.mocked(obtenerRaci).mockResolvedValue(null);
  vi.mocked(obtenerRai).mockResolvedValue(null);
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
        subidoPorId: 1,
        subidoPor: null,
        hashContenido: 'a'.repeat(64),
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

    it('en auditoría muestra el cierre y deja revisar los hallazgos', async () => {
      const { user } = renderPanel('EN_AUDITORIA');

      expect(await screen.findByText('Cierre de la auditoría')).toBeTruthy();
      expect(
        screen.getByText('Quedan 1 observación sin revisar.'),
      ).toBeTruthy();
      await user.click(
        await screen.findByRole('button', { name: /Saldo de cuenta/ }),
      );
      expect(
        await screen.findByRole('button', {
          name: /Confirmar la observación 1/,
        }),
      ).toBeTruthy();
    });

    it('cerrada queda de solo lectura: resumen del cierre y ninguna acción de revisión', async () => {
      vi.mocked(obtenerEjecucion).mockResolvedValue({
        ...MOCK_EJECUCION,
        cerradaEn: '2026-10-26T16:00:00.000Z',
        cerradaPorId: 44,
        cerradaPor: { id: 44, nombre: 'Luis', apellido: 'Gómez' },
        conclusion: 'Sin diferencias materiales.',
        estadoFinal: 'AUDITADA',
        observaciones: { abiertas: 0, confirmadas: 0, descartadas: 1 },
      });
      const { user } = renderPanel('AUDITADA');

      expect(await screen.findByText('Auditoría cerrada')).toBeTruthy();
      expect(screen.getByText('Sin diferencias materiales.')).toBeTruthy();
      await user.click(
        await screen.findByRole('button', { name: /Saldo de cuenta/ }),
      );
      expect(
        screen.queryByRole('button', { name: /Confirmar la observación/ }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Cerrar auditoría' }),
      ).toBeNull();
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
      expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1);
      expect(
        screen.getByText(/Mostrando solo las reglas fallidas/),
      ).toBeTruthy();

      await user.click(fallidas);
      expect(fallidas.getAttribute('aria-pressed')).toBe('false');
      expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3);
    });

    it('«Quitar filtro» vuelve a mostrar todas', async () => {
      const { user } = renderPanel('EN_AUDITORIA');
      await reglas();
      await user.click(screen.getByRole('button', { name: /Omitidas/ }));

      await user.click(screen.getByRole('button', { name: 'Quitar filtro' }));

      expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3);
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

describe('con el libro RACI y las 14 reglas', () => {
  const base = MOCK_RESULTADOS[0].observaciones[0];
  const regla = (
    codigoRegla: string,
    descripcion: string,
    parcial: Partial<ResultadoValidacion> = {},
  ): ResultadoValidacion => ({
    codigoRegla,
    descripcion,
    estado: 'VERIFICADO',
    observaciones: [],
    filasEvaluadas: 4,
    librosFaltantes: [],
    ...parcial,
  });

  const resultados: ResultadoValidacion[] = [
    regla('F1', 'Coherencia de fechas'),
    regla('P1', 'Existencia de cheques', {
      estado: 'FALTAN_LIBROS',
      mensaje: 'Faltan libros requeridos: RACI',
      filasEvaluadas: null,
      librosFaltantes: ['RACI'],
    }),
    regla('C1', 'Egresos devengados (RACI)', {
      estado: 'FALLO',
      filasEvaluadas: 1,
      observaciones: [
        {
          ...base,
          id: 41,
          codigoRegla: 'C1',
          tipo: 'CRUZAMIENTO',
          descripcion: 'Lo devengado en el RACI no coincide con los egresos.',
          libroOrigen: 'RACI',
          transaccionId: null,
          transaccionIngresoEgresoId: null,
          transaccionRaciId: null,
        },
      ],
    }),
    regla('V4', 'Secuencia lógica del gasto', {
      estado: 'FALLO',
      filasEvaluadas: 5,
      observaciones: [
        {
          ...base,
          id: 40,
          codigoRegla: 'V4',
          tipo: 'INTERNA',
          descripcion: 'El asiento 5 tiene un pago sin devengado.',
          libroOrigen: 'RACI',
          transaccionId: null,
          transaccionIngresoEgresoId: null,
          transaccionRaciId: 702,
        },
      ],
    }),
    regla('V1', 'Saldo de caja'),
  ];

  beforeEach(() => {
    vi.mocked(obtenerEjecucion).mockResolvedValue({
      ...MOCK_EJECUCION,
      resultados,
    } satisfies Ejecucion);
    vi.mocked(obtenerRaci).mockResolvedValue({
      id: 7,
      cuentaMensualId: 5,
      fechaCreacion: '2026-10-15T12:00:00.000Z',
      subidoPorId: 1,
      subidoPor: null,
      hashContenido: 'b'.repeat(64),
      transacciones: [
        { id: 701, asiento: 4 },
        { id: 702, asiento: 5 },
      ],
    } as unknown as RaciGuardado);
  });

  it('agrupa las reglas por tipo (V, C, P, F) y las ordena por código dentro de cada grupo', async () => {
    renderPanel('EN_AUDITORIA');

    const titulos = await reglas();
    expect(titulos.map((h) => h.textContent)).toEqual([
      expect.stringContaining('Saldo de caja'),
      expect.stringContaining('Secuencia lógica del gasto'),
      expect.stringContaining('Egresos devengados (RACI)'),
      expect.stringContaining('Existencia de cheques'),
      expect.stringContaining('Coherencia de fechas'),
    ]);
    for (const nombre of [
      'Validaciones internas',
      'Cruces entre libros',
      'Integridad de cheques',
      'Coherencia de fechas',
    ]) {
      expect(screen.getByRole('region', { name: nombre })).toBeTruthy();
    }
    // cada grupo resume lo suyo
    expect(
      within(
        screen.getByRole('region', { name: 'Integridad de cheques' }),
      ).getByText('1 no aplica'),
    ).toBeTruthy();
  });

  it('una regla que espera el RACI opcional no cuenta como omitida ni como problema', async () => {
    renderPanel('EN_AUDITORIA');
    await reglas();

    const filtro = screen.getByRole('group', {
      name: 'Filtrar las reglas por resultado',
    });
    const omitidas = within(filtro).getByRole('button', {
      name: /Omitidas\s*0/,
    });
    expect((omitidas as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(/1 regla no aplica porque no se cargó el RACI/),
    ).toBeTruthy();
  });

  it('un hallazgo de un asiento del RACI se cita por asiento y lleva a ese libro', async () => {
    const { user, onVerEnLibro } = renderPanel('EN_AUDITORIA');

    await user.click(
      await screen.findByRole('button', { name: /Secuencia lógica del gasto/ }),
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'Ver el asiento 5 de RACI en el libro',
      }),
    );

    expect(onVerEnLibro).toHaveBeenCalledWith(
      expect.objectContaining({
        libroTipo: 'RACI',
        libroId: 7,
        transaccionId: 702,
        asiento: 5,
      }),
    );
  });

  it('un cruce del RACI (C1) es de toda la cuenta: nombra el libro y no ofrece ir a una fila', async () => {
    const { user } = renderPanel('EN_AUDITORIA');

    await user.click(
      await screen.findByRole('button', {
        name: /Egresos devengados \(RACI\)/,
      }),
    );

    expect(
      await screen.findByText(
        'Lo devengado en el RACI no coincide con los egresos.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /en el libro/ })).toBeNull();
  });
});

describe('con el libro RAI y las 17 reglas', () => {
  const base = MOCK_RESULTADOS[0].observaciones[0];
  const regla = (
    codigoRegla: string,
    descripcion: string,
    parcial: Partial<ResultadoValidacion> = {},
  ): ResultadoValidacion => ({
    codigoRegla,
    descripcion,
    estado: 'VERIFICADO',
    observaciones: [],
    filasEvaluadas: 4,
    librosFaltantes: [],
    ...parcial,
  });
  const sinLibro = (libro: string): Partial<ResultadoValidacion> => ({
    estado: 'FALTAN_LIBROS',
    mensaje: `Faltan libros requeridos: ${libro}`,
    filasEvaluadas: null,
    librosFaltantes: [libro],
  });
  const hallazgo = (
    id: number,
    codigoRegla: string,
    tipo: string,
    parcial: Record<string, unknown>,
  ) => ({
    ...base,
    id,
    codigoRegla,
    tipo,
    libroOrigen: 'RAI',
    transaccionId: null,
    transaccionIngresoEgresoId: null,
    transaccionRaciId: null,
    transaccionRaiId: null,
    ...parcial,
  });

  const resultados: ResultadoValidacion[] = [
    regla('V1', 'Saldo de caja'),
    regla('V4', 'Secuencia lógica del gasto', sinLibro('RACI')),
    regla('V7', 'Coherencia de suma mensual', {
      estado: 'FALLO',
      filasEvaluadas: 1,
      observaciones: [
        hallazgo(50, 'V7', 'INTERNA', {
          descripcion:
            'La suma de septiembre no coincide con el ingreso mensual.',
          transaccionRaiId: 90,
        }),
      ],
    }),
    regla('C3', 'Ingresos del mes (RAI)', {
      estado: 'FALLO',
      filasEvaluadas: 1,
      observaciones: [
        hallazgo(51, 'C3', 'CRUZAMIENTO', {
          descripcion:
            'Los ingresos del RAI no coinciden con los de Ingresos y Egresos.',
        }),
      ],
    }),
    regla('P3', 'Existencia de ingresos', {
      estado: 'FALLO',
      filasEvaluadas: 2,
      observaciones: [
        hallazgo(52, 'P3', 'INTEGRIDAD', {
          descripcion:
            'El ingreso («Venta activo fijo», 30/09/2026) no está en Ingresos y Egresos.',
          transaccionRaiId: 91,
        }),
      ],
    }),
    regla('F1', 'Coherencia de fechas'),
  ];

  beforeEach(() => {
    vi.mocked(obtenerEjecucion).mockResolvedValue({
      ...MOCK_EJECUCION,
      resultados,
    } satisfies Ejecucion);
    vi.mocked(obtenerRai).mockResolvedValue({
      id: 8,
      cuentaMensualId: 5,
      fechaCreacion: '2026-10-15T12:00:00.000Z',
      subidoPorId: 1,
      subidoPor: null,
      hashContenido: 'c'.repeat(64),
      transacciones: [
        {
          id: 90,
          asiento: null,
          fecha: '2026-09-29',
          concepto: 'anticipo Coparticipacion sept/25',
        },
        {
          id: 91,
          asiento: null,
          fecha: '2026-09-30',
          concepto: 'Venta activo fijo',
        },
      ],
    } as unknown as RaiGuardado);
  });

  it('V7, C3 y P3 caen en su grupo, junto a las reglas del resto de los libros', async () => {
    renderPanel('EN_AUDITORIA');

    const titulos = await reglas();
    expect(titulos.map((h) => h.textContent)).toEqual([
      expect.stringContaining('Saldo de caja'),
      expect.stringContaining('Secuencia lógica del gasto'),
      expect.stringContaining('Coherencia de suma mensual'),
      expect.stringContaining('Ingresos del mes (RAI)'),
      expect.stringContaining('Existencia de ingresos'),
      expect.stringContaining('Coherencia de fechas'),
    ]);
    expect(
      screen.getByRole('region', { name: 'Integridad de cheques' }),
    ).toBeTruthy();
  });

  it('un asiento del RAI sin N° se cita por fecha y concepto y lleva a ese libro', async () => {
    const { user, onVerEnLibro } = renderPanel('EN_AUDITORIA');

    await user.click(
      await screen.findByRole('button', { name: /Coherencia de suma mensual/ }),
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'Ver el asiento del 29/09/2026 («anticipo Coparticipacion sept/25») de RAI en el libro',
      }),
    );

    expect(onVerEnLibro).toHaveBeenCalledWith(
      expect.objectContaining({
        libroTipo: 'RAI',
        libroId: 8,
        transaccionId: 90,
        fechaAsiento: '2026-09-29',
      }),
    );
  });

  it('el cruce C3 es de toda la cuenta: nombra el libro y no ofrece ir a una fila', async () => {
    const { user } = renderPanel('EN_AUDITORIA');

    await user.click(
      await screen.findByRole('button', { name: /Ingresos del mes \(RAI\)/ }),
    );

    expect(
      await screen.findByText(
        /Los ingresos del RAI no coinciden con los de Ingresos y Egresos/,
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /en el libro/ })).toBeNull();
  });

  it('sin RAI, V7, C3 y P3 no aplican y el aviso nombra al RAI', async () => {
    const sinRai = [
      regla('V7', 'Coherencia de suma mensual', sinLibro('RAI')),
      regla('C3', 'Ingresos del mes (RAI)', sinLibro('RAI')),
      regla('P3', 'Existencia de ingresos', sinLibro('RAI')),
      regla('V1', 'Saldo de caja'),
    ];
    vi.mocked(obtenerEjecucion).mockResolvedValue({
      ...MOCK_EJECUCION,
      resultados: sinRai,
    } satisfies Ejecucion);
    renderPanel('EN_AUDITORIA');
    await reglas();

    expect(
      screen.getByText(/3 reglas no aplican porque no se cargó el RAI/),
    ).toBeTruthy();
    const filtro = screen.getByRole('group', {
      name: 'Filtrar las reglas por resultado',
    });
    expect(
      (
        within(filtro).getByRole('button', {
          name: /Omitidas\s*0/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('sin RACI ni RAI el aviso los nombra a los dos', async () => {
    vi.mocked(obtenerEjecucion).mockResolvedValue({
      ...MOCK_EJECUCION,
      resultados: [
        regla('V4', 'Secuencia lógica del gasto', sinLibro('RACI')),
        regla('V7', 'Coherencia de suma mensual', sinLibro('RAI')),
      ],
    } satisfies Ejecucion);
    renderPanel('EN_AUDITORIA');
    await reglas();

    expect(
      screen.getByText(
        /2 reglas no aplican porque no se cargaron el RACI y el RAI, que son libros opcionales/,
      ),
    ).toBeTruthy();
  });
});
