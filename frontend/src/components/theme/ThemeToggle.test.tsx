// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ThemeToggle } from './ThemeToggle';

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
});

function renderizar(tema: 'light' | 'dark' = 'light') {
  return render(
    <ThemeProvider attribute="class" defaultTheme={tema} enableSystem>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('con un solo botón pasa de claro a oscuro y recuerda la elección', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar a tema oscuro' }),
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(
      screen.getByRole('button', { name: 'Cambiar a tema claro' }),
    ).toBeTruthy();
  });

  it('vuelve de oscuro a claro con el mismo botón', async () => {
    const user = userEvent.setup();
    renderizar('dark');

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar a tema claro' }),
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
