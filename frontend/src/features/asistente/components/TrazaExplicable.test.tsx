// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { PasoRazonamiento } from '../types';
import { TrazaExplicable } from './TrazaExplicable';

const completado: PasoRazonamiento = {
  id: 'p1',
  accion: 'consulta_datos',
  descripcion: 'Total de depósitos del libro banco de febrero',
  fuentes: ['libro banco', 'rendiciones'],
  estado: 'completado',
  resultado: 'Encontré 1 registro',
  cantidadRegistros: 1,
  duracionMs: 50,
  parcial: false,
};

afterEach(cleanup);

describe('TrazaExplicable', () => {
  it('no se dibuja si no hubo pasos', () => {
    const { container } = render(<TrazaExplicable pasos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra qué buscó la IA, en qué áreas y qué encontró', () => {
    render(<TrazaExplicable pasos={[completado]} />);
    expect(screen.getByRole('list', { name: 'Pasos de la IA' })).toBeTruthy();
    expect(
      screen.getByText('Total de depósitos del libro banco de febrero'),
    ).toBeTruthy();
    expect(screen.getByText('Fuentes: libro banco · rendiciones')).toBeTruthy();
    expect(screen.getByText('Encontré 1 registro')).toBeTruthy();
    expect(screen.getByText('1 registro')).toBeTruthy();
    expect(screen.getByText('50 ms')).toBeTruthy();
    expect(screen.getByText('Completado')).toBeTruthy();
  });

  it('un paso en curso avisa que está ocupado y no muestra resultado ni métricas', () => {
    render(
      <TrazaExplicable
        pasos={[
          {
            ...completado,
            estado: 'en_curso',
            resultado: null,
            cantidadRegistros: null,
            duracionMs: null,
          },
        ]}
      />,
    );
    expect(screen.getByText('En curso')).toBeTruthy();
    expect(screen.getByRole('listitem').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText(/registro/)).toBeNull();
    expect(screen.queryByText(/ms$/)).toBeNull();
  });

  it('un paso con error se dice con texto, no solo con color', () => {
    render(
      <TrazaExplicable
        pasos={[
          {
            ...completado,
            estado: 'error',
            resultado: 'No pude completar este paso',
            cantidadRegistros: null,
            duracionMs: null,
          },
        ]}
      />,
    );
    expect(screen.getByText('No se pudo completar')).toBeTruthy();
    expect(screen.getByText('No pude completar este paso')).toBeTruthy();
  });

  it('marca el resultado parcial y el paso sin resultados', () => {
    render(
      <TrazaExplicable
        pasos={[
          { ...completado, parcial: true },
          {
            ...completado,
            id: 'p2',
            estado: 'sin_resultados',
            resultado: 'No encontré registros',
            cantidadRegistros: 0,
          },
        ]}
      />,
    );
    expect(screen.getByText('Resultado parcial')).toBeTruthy();
    expect(screen.getByText('Sin resultados')).toBeTruthy();
    expect(screen.getByText('0 registros')).toBeTruthy();
  });

  it('el texto del servidor se pinta como texto, no como HTML', () => {
    render(
      <TrazaExplicable
        pasos={[{ ...completado, descripcion: '<img src=x onerror=alert(1)>' }]}
      />,
    );
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  });

  it('un estado desconocido no rompe la traza', () => {
    render(<TrazaExplicable pasos={[{ ...completado, estado: 'pausado' }]} />);
    expect(screen.getByText('pausado')).toBeTruthy();
  });
});
