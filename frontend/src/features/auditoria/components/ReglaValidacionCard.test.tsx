// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import type { ObservacionUbicada } from '../types/auditoria.types';
import { ReglaValidacionCard } from './ReglaValidacionCard';

const [fallo, verificado, faltan] = MOCK_RESULTADOS;

/** Datos de revisión de una observación todavía abierta, para completar las de los tests. */
const SIN_REVISAR = {
  estado: 'ABIERTA',
  valorInformado: null,
  valorCalculado: null,
  diferencia: null,
  motivoDescarte: null,
  revisadaPor: null,
  revisadaEn: null,
} as const;

const ubicada: ObservacionUbicada = {
  ...SIN_REVISAR,
  id: 1,
  mensaje: fallo.observaciones[0].descripcion,
  transaccionId: 12,
  libroTipo: 'LIBRO_BANCO',
  libroId: 2,
  libroNombre: 'Cta. Cte. 200/2',
  fila: 3,
};

function renderCard(
  resultado = fallo,
  props: Partial<Parameters<typeof ReglaValidacionCard>[0]> = {},
) {
  const onVerEnLibro = vi.fn();
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ul>
        <ReglaValidacionCard
          resultado={resultado}
          observaciones={[ubicada]}
          cuentaMensualId={5}
          onVerEnLibro={onVerEnLibro}
          {...props}
        />
      </ul>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onVerEnLibro };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReglaValidacionCard', () => {
  it('llega plegada: nombre, código y contadores sin abrir nada', () => {
    renderCard();

    const boton = screen.getByRole('button', { name: /Saldo de cuenta/ });
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(within(boton).getByText('V3')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();

    const contadores = screen.getByRole('list', {
      name: 'Resultado de la regla',
    });
    // el motor informa 9 controles; 1 con observación → 8 verificados
    expect(
      within(contadores).getByText('1 control con observaciones'),
    ).toBeTruthy();
    expect(
      within(contadores).getByText('8 controles verificados'),
    ).toBeTruthy();
    expect(within(contadores).getByText('0 libros faltantes')).toBeTruthy();
  });

  it('el estado no depende solo del color: el nombre accesible lo dice', () => {
    renderCard();

    expect(
      screen.getByRole('button', { name: /Con observaciones/ }),
    ).toBeTruthy();
  });

  it('FALLO: al abrirla muestra la tabla de observaciones con fila, libro y detalle', async () => {
    const { user } = renderCard();

    await user.click(screen.getByRole('button', { name: /Saldo de cuenta/ }));

    expect(screen.getByRole('table')).toBeTruthy();
    for (const columna of ['Fila', 'Libro', 'Detalle']) {
      expect(screen.getByRole('columnheader', { name: columna })).toBeTruthy();
    }
    const fila = screen.getAllByRole('row')[1];
    expect(within(fila).getByText('3')).toBeTruthy();
    expect(within(fila).getByText('Cta. Cte. 200/2')).toBeTruthy();
    expect(
      within(fila).getByText(/no coincide con el saldo informado/),
    ).toBeTruthy();
  });

  it('«Ver en el libro» avisa con la observación elegida', async () => {
    const { user, onVerEnLibro } = renderCard();
    await user.click(screen.getByRole('button', { name: /Saldo de cuenta/ }));

    await user.click(
      screen.getByRole('button', {
        name: 'Ver la fila 3 de Cta. Cte. 200/2 en el libro',
      }),
    );

    expect(onVerEnLibro).toHaveBeenCalledWith(ubicada);
  });

  it('una observación que no se pudo ubicar se muestra sin el botón', async () => {
    const { user } = renderCard(fallo, {
      observaciones: [
        { ...SIN_REVISAR, id: 1, mensaje: 'Sin ubicar', transaccionId: 99 },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Saldo de cuenta/ }));

    expect(screen.getByText('Sin ubicar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ver la fila/ })).toBeNull();
  });

  it('un cruce entre libros se lista sin fila y sin botón para ir a ella', async () => {
    const { user } = renderCard(fallo, {
      observaciones: [
        {
          ...SIN_REVISAR,
          id: 7,
          mensaje: 'Los depósitos del banco no coinciden con los del libro',
          transaccionId: null,
          libroNombre: 'Ingresos y Egresos',
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Saldo de cuenta/ }));

    const fila = screen.getAllByRole('row')[1];
    expect(within(fila).getByText('Ingresos y Egresos')).toBeTruthy();
    expect(within(fila).getByText('—')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ver la fila/ })).toBeNull();
  });

  it('con un único control lo dice en singular', async () => {
    const { user } = renderCard(
      { ...verificado, filasEvaluadas: 1 },
      { observaciones: [] },
    );
    await user.click(screen.getByRole('button', { name: /Verificada/ }));

    expect(
      screen.getByText('Se hizo 1 control y no se encontraron diferencias.'),
    ).toBeTruthy();
  });

  it('VERIFICADO: no hay tabla, solo cuántos controles se hicieron', async () => {
    const { user } = renderCard(
      { ...verificado, codigoRegla: 'V3' },
      { observaciones: [] },
    );

    await user.click(screen.getByRole('button', { name: /Verificada/ }));

    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.getByText(
        'Se hicieron 4 controles y no se encontraron diferencias.',
      ),
    ).toBeTruthy();
  });

  it('FALTAN_LIBROS: dice qué libro falta y cuenta libros, no controles', async () => {
    const { user } = renderCard(faltan, { observaciones: [] });

    const contadores = screen.getByRole('list', {
      name: 'Resultado de la regla',
    });
    expect(within(contadores).getByText('1 libro faltante')).toBeTruthy();
    expect(
      within(contadores).getByText('0 controles verificados'),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Omitida/ }));
    expect(
      screen.getByText(
        'No se pudo evaluar esta regla porque falta: Ingresos y Egresos. Necesita ese libro para poder correr.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('con libros todavía cargándose, la fila se indica como pendiente', async () => {
    const { user } = renderCard(fallo, {
      ubicando: true,
      observaciones: [
        {
          ...SIN_REVISAR,
          id: 1,
          mensaje: 'Diferencia de 100',
          transaccionId: 12,
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Saldo de cuenta/ }));

    expect(screen.queryByRole('button', { name: /Ver la fila/ })).toBeNull();
    expect(screen.getByText('Diferencia de 100')).toBeTruthy();
  });
});
