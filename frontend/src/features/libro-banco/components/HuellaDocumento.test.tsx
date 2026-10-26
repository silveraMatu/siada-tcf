// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { abreviarHuella, HuellaDocumento } from './HuellaDocumento';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const HASH = '9f2c1a7b3d4e5f60718293a4b5c6d7e8f9012345a6b7c8d9e0f1a2b3c4d5e6f7';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('abreviarHuella', () => {
  it('deja el comienzo y el final', () => {
    expect(abreviarHuella(HASH)).toBe('9f2c1a7b…d5e6f7');
  });

  it('un valor corto se muestra tal cual', () => {
    expect(abreviarHuella('abc123')).toBe('abc123');
  });
});

describe('HuellaDocumento', () => {
  it('muestra la huella abreviada con la completa a mano', () => {
    render(<HuellaDocumento hash={HASH} />);

    const codigo = screen.getByText('9f2c1a7b…d5e6f7');
    expect(codigo.getAttribute('title')).toBe(HASH);
    expect(screen.getByText('Huella SHA-256')).toBeTruthy();
  });

  it('copia la huella completa y avisa a los lectores de pantalla', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    // userEvent instala su propio portapapeles: se lo reemplaza para poder verificar el texto copiado
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: escribir },
    });
    render(<HuellaDocumento hash={HASH} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Copiar la huella completa del documento',
      }),
    );

    expect(escribir).toHaveBeenCalledWith(HASH);
    expect((await screen.findByRole('status')).textContent).toBe(
      'Huella copiada',
    );
  });

  it('si el navegador no deja copiar, lo avisa', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) },
    });
    render(<HuellaDocumento hash={HASH} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Copiar la huella completa del documento',
      }),
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
