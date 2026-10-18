import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { getToken, TOKEN_KEY } from './auth-token';

function stubLocalStorage(valor: string | null) {
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => (clave === TOKEN_KEY ? valor : null),
  });
}

/** Ejecuta una petición con un adapter falso y devuelve el header Authorization enviado. */
async function authorizationEnviado(): Promise<unknown> {
  const respuesta = await api.get('/x', {
    adapter: async (config: InternalAxiosRequestConfig) => ({
      data: config.headers.Authorization,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  });
  return respuesta.data;
}

afterEach(() => vi.unstubAllGlobals());

describe('interceptor de autenticación', () => {
  it('envía el JWT guardado como Bearer', async () => {
    stubLocalStorage('abc.def.ghi');
    expect(await authorizationEnviado()).toBe('Bearer abc.def.ghi');
  });

  it('no agrega el header si no hay token', async () => {
    stubLocalStorage(null);
    expect(await authorizationEnviado()).toBeUndefined();
  });

  it('no falla si localStorage lanza una excepción', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(getToken()).toBeNull();
    expect(await authorizationEnviado()).toBeUndefined();
  });
});
