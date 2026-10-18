import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TOKEN_KEY } from '@/lib/auth-token';
import { crearEstadoInicial, leerSesion, useAuthStore } from './useAuth';

const base64url = (obj: object) =>
  btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** JWT sin firma real: `leerSesion` solo decodifica. */
function crearToken(payload: object): string {
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.firma`;
}

const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;
const valido = {
  sub: 7,
  email: 'ana@organismo.gob.ar',
  roles: ['AUDITOR', 'ADMIN'],
  exp: enUnaHora(),
};

let almacen: Map<string, string>;

beforeEach(() => {
  almacen = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
afterEach(() => vi.unstubAllGlobals());

describe('leerSesion', () => {
  it('decodifica un token válido y ordena los roles', () => {
    expect(leerSesion(crearToken(valido))).toEqual({
      sub: 7,
      email: 'ana@organismo.gob.ar',
      roles: ['ADMIN', 'AUDITOR'],
    });
  });

  it('descarta roles desconocidos', () => {
    const user = leerSesion(crearToken({ ...valido, roles: ['SUPERUSER', 'AUDITOR'] }));
    expect(user?.roles).toEqual(['AUDITOR']);
  });

  it('acepta un token sin roles, con arreglo vacío', () => {
    expect(leerSesion(crearToken({ ...valido, roles: [] }))?.roles).toEqual([]);
  });

  it.each([
    ['vacío', null],
    ['malformado', 'esto-no-es-un-jwt'],
    ['vencido', crearToken({ ...valido, exp: Math.floor(Date.now() / 1000) - 10 })],
    ['sin email', crearToken({ sub: 1, roles: [], exp: enUnaHora() })],
    ['sin sub', crearToken({ email: 'a@b.com', roles: [], exp: enUnaHora() })],
    ['roles que no es arreglo', crearToken({ ...valido, roles: 'ADMIN' })],
  ])('devuelve null con un token %s', (_nombre, token) => {
    expect(leerSesion(token)).toBeNull();
  });
});

describe('estado inicial', () => {
  it('recupera la sesión guardada en localStorage', () => {
    const token = crearToken(valido);
    almacen.set(TOKEN_KEY, token);
    expect(crearEstadoInicial()).toMatchObject({ token, isAuthenticated: true });
  });

  it('descarta y borra un token vencido o alterado', () => {
    almacen.set(TOKEN_KEY, 'token-alterado');
    expect(crearEstadoInicial()).toEqual({
      token: null,
      user: null,
      isAuthenticated: false,
    });
    expect(almacen.has(TOKEN_KEY)).toBe(false);
  });
});

describe('useAuthStore', () => {
  it('login persiste el token y autentica', () => {
    const token = crearToken(valido);
    useAuthStore.getState().login(token);

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.email).toBe('ana@organismo.gob.ar');
    expect(almacen.get(TOKEN_KEY)).toBe(token);
  });

  it('login con un token inválido no abre sesión', () => {
    useAuthStore.getState().login('basura');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(almacen.has(TOKEN_KEY)).toBe(false);
  });

  it('logout limpia el token y el estado', () => {
    useAuthStore.getState().login(crearToken(valido));
    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      user: null,
      isAuthenticated: false,
    });
    expect(almacen.has(TOKEN_KEY)).toBe(false);
  });
});
