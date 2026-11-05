// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { MensajeChat, PasoRazonamiento } from '../types';
import { PanelRazonamiento } from './PanelRazonamiento';

const paso: PasoRazonamiento = {
  id: 'p1',
  accion: 'consulta_datos',
  descripcion: 'Total de depósitos',
  fuentes: ['libro banco'],
  estado: 'completado',
  resultado: 'Encontré 1 registro',
  cantidadRegistros: 1,
  duracionMs: 4,
  parcial: false,
};

const conPasos: MensajeChat = {
  id: '1',
  rol: 'assistant',
  contenido: 'ok',
  pasos: [paso],
};

afterEach(cleanup);

describe('PanelRazonamiento', () => {
  it('sin respuesta explica para qué sirve', () => {
    render(<PanelRazonamiento enCurso={false} />);
    expect(screen.getByText('Todavía no hay pasos')).toBeTruthy();
  });

  it('en curso y sin pasos todavía dice que analiza la pregunta', () => {
    render(<PanelRazonamiento enCurso />);
    expect(screen.getByText('Analizando su pregunta…')).toBeTruthy();
  });

  it('en curso muestra los pasos en vivo y no dice que analiza mientras uno espera su resultado', () => {
    render(
      <PanelRazonamiento
        enCurso
        pasosEnVivo={[{ ...paso, estado: 'en_curso', resultado: null }]}
      />,
    );
    expect(screen.getByText('En curso')).toBeTruthy();
    expect(screen.queryByText(/Analizando/)).toBeNull();
  });

  it('en curso, con todos los pasos terminados, dice que analiza los resultados', () => {
    render(<PanelRazonamiento enCurso pasosEnVivo={[paso]} />);
    expect(screen.getByText('Analizando los resultados…')).toBeTruthy();
  });

  it('con una respuesta muestra sus pasos, la cantidad y a qué pregunta corresponde', () => {
    render(
      <PanelRazonamiento
        enCurso={false}
        mensaje={conPasos}
        pregunta="¿Cuánto?"
        pasosEnVivo={[{ ...paso, descripcion: 'No debe verse' }]}
      />,
    );
    expect(screen.getByText(/· 1 paso/)).toBeTruthy();
    expect(screen.getByText('Para: ¿Cuánto?')).toBeTruthy();
    expect(screen.getByText('Total de depósitos')).toBeTruthy();
    expect(screen.queryByText('No debe verse')).toBeNull();
  });

  it('una respuesta sin pasos lo dice', () => {
    render(
      <PanelRazonamiento
        enCurso={false}
        mensaje={{ ...conPasos, pasos: [] }}
      />,
    );
    expect(screen.getByText(/no necesitó consultar/)).toBeTruthy();
  });
});
