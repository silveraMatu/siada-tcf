import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { getToken, TOKEN_KEY } from '@/lib/auth-token';
import { useAuthStore } from './useAuth';

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

let almacen: Map<string, string>;

/** Inicia sesión: deja el token en el almacenamiento y el estado como autenticado. */
function iniciarSesion() {
  almacen.set(TOKEN_KEY, 'abc.def.ghi');
  useAuthStore.setState({
    token: 'abc.def.ghi',
    user: { sub: 1, email: 'a@b.gob.ar', roles: ['ADMIN'] },
    isAuthenticated: true,
  });
}

/** El servidor rechaza con 401 la petición (que sale con el token guardado). */
const peticionNoAutorizada = () =>
  api
    .get('/organismos', {
      adapter: (config: InternalAxiosRequestConfig) =>
        Promise.reject(
          new AxiosError(
            'no autorizado',
            'ERR_BAD_REQUEST',
            config,
            undefined,
            {
              status: 401,
              statusText: 'Unauthorized',
              headers: {},
              config,
              data: {},
            },
          ),
        ),
    })
    .catch((error: unknown) => error);

beforeEach(() => {
  almacen = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('sesión vencida (401 con token)', () => {
  it('cierra la sesión, borra el token guardado y avisa al usuario', async () => {
    iniciarSesion();

    await peticionNoAutorizada();

    const estado = useAuthStore.getState();
    expect(estado.isAuthenticated).toBe(false);
    expect(estado.user).toBeNull();
    expect(getToken()).toBeNull();
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it('varias peticiones que fallan a la vez avisan una sola vez', async () => {
    iniciarSesion();

    await Promise.all([
      peticionNoAutorizada(),
      peticionNoAutorizada(),
      peticionNoAutorizada(),
    ]);

    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it('sin sesión iniciada un 401 no muestra ningún aviso', async () => {
    almacen.set(TOKEN_KEY, 'token-de-otra-pestana');

    await peticionNoAutorizada();

    expect(toast.info).not.toHaveBeenCalled();
  });
});
