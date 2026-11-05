// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { urlSegura } from '../lib/urls';
import type { MensajeChat } from '../types';
import { MensajeBurbuja } from './MensajeBurbuja';

const respuesta = (contenido: string): MensajeChat => ({
  id: '1',
  rol: 'assistant',
  contenido,
});

afterEach(cleanup);

describe('MensajeBurbuja', () => {
  it('identifica quién habla con una etiqueta de texto', () => {
    render(
      <MensajeBurbuja mensaje={{ id: '1', rol: 'user', contenido: 'Hola' }} />,
    );
    expect(screen.getByText('Usted')).toBeTruthy();
    cleanup();
    render(<MensajeBurbuja mensaje={respuesta('Hola')} />);
    expect(screen.getByText('Copiloto')).toBeTruthy();
  });

  it('renderiza el markdown del modelo (negritas, listas y tablas)', () => {
    render(
      <MensajeBurbuja
        mensaje={respuesta(
          '**Total:** 10\n\n- uno\n- dos\n\n| a | b |\n|---|---|\n| 1 | 2 |',
        )}
      />,
    );
    expect(screen.getByText('Total:').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('no deja pasar HTML crudo ni enlaces javascript:', () => {
    const { container } = render(
      <MensajeBurbuja
        mensaje={respuesta(
          '<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[malo](javascript:alert(1)) [bueno](https://example.com)',
        )}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    const enlaces = container.querySelectorAll('a');
    const hrefs = [...enlaces].map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('javascript:alert(1)');
    const bueno = screen.getByRole('link', { name: 'bueno' });
    expect(bueno.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('con pasos ofrece un botón que abre el razonamiento en el panel, sin dibujar la traza en el hilo', async () => {
    const onVer = vi.fn();
    render(
      <MensajeBurbuja
        onVerRazonamiento={onVer}
        razonamientoActivo
        mensaje={{
          ...respuesta('Listo'),
          pasos: [
            {
              id: 'p1',
              accion: 'consulta_datos',
              descripcion: 'Total de depósitos',
              fuentes: ['libro banco'],
              estado: 'completado',
              resultado: 'Encontré 1 registro',
              cantidadRegistros: 1,
              duracionMs: 3,
              parcial: false,
            },
          ],
        }}
      />,
    );
    const boton = screen.getByRole('button', {
      name: 'Ver razonamiento · 1 paso',
    });
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('Total de depósitos')).toBeNull();
    await userEvent.click(boton);
    expect(onVer).toHaveBeenCalledOnce();
  });

  it('sin pasos no ofrece razonamiento', () => {
    render(
      <MensajeBurbuja
        onVerRazonamiento={vi.fn()}
        mensaje={{ ...respuesta('Listo'), pasos: [] }}
      />,
    );
    expect(screen.queryByRole('button', { name: /razonamiento/i })).toBeNull();
  });

  it('un mensaje de error es una alerta con reintento', async () => {
    const onReintentar = vi.fn();
    render(
      <MensajeBurbuja
        mensaje={{ ...respuesta('No disponible'), esError: true }}
        onReintentar={onReintentar}
      />,
    );
    expect(screen.getByRole('alert').textContent).toMatch(/No disponible/);
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onReintentar).toHaveBeenCalledOnce();
  });
});

describe('urlSegura', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['http://example.com', 'http://example.com'],
    ['mailto:a@b.com', 'mailto:a@b.com'],
    ['javascript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['/relativo', ''],
  ])('%s → %s', (entrada, salida) => {
    expect(urlSegura(entrada)).toBe(salida);
  });
});
