import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, registrarManejadorSesionExpirada } from './api';
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

afterEach(() => {
  vi.unstubAllGlobals();
  registrarManejadorSesionExpirada(null);
});

/** Petición que el servidor rechaza con ese status; devuelve el error que ve quien la llamó. */
async function peticionRechazada(url: string, status: number, conToken = true) {
  stubLocalStorage(conToken ? 'abc.def.ghi' : null);
  return await api
    .get(url, {
      adapter: (config: InternalAxiosRequestConfig) =>
        Promise.reject(
          new AxiosError('rechazada', 'ERR_BAD_REQUEST', config, undefined, {
            status,
            statusText: 'x',
            headers: {},
            config,
            data: {},
          }),
        ),
    })
    .catch((error: unknown) => error);
}

describe('interceptor de sesión vencida', () => {
  it('avisa cuando el servidor rechaza con 401 una petición que llevaba token', async () => {
    const manejador = vi.fn();
    registrarManejadorSesionExpirada(manejador);

    const error = await peticionRechazada('/cuentas-mensuales', 401);

    expect(manejador).toHaveBeenCalledTimes(1);
    // el error sigue llegando a quien hizo la petición
    expect(error).toBeInstanceOf(AxiosError);
  });

  it.each([
    ['un 401 sin token enviado (no había sesión)', '/organismos', 401, false],
    ['un 401 del login (credenciales incorrectas)', '/auth/login', 401, true],
    ['un 403 (falta el rol, la sesión sigue válida)', '/organismos', 403, true],
    ['un 409', '/cuentas-mensuales/1/presentar', 409, true],
    ['un 500', '/organismos', 500, true],
  ])('no avisa ante %s', async (_caso, url, status, conToken) => {
    const manejador = vi.fn();
    registrarManejadorSesionExpirada(manejador);

    await peticionRechazada(url, status, conToken);

    expect(manejador).not.toHaveBeenCalled();
  });

  it('sin manejador registrado el 401 llega igual a quien llamó', async () => {
    const error = await peticionRechazada('/organismos', 401);

    expect(error).toBeInstanceOf(AxiosError);
  });
});

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
