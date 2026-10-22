import { jwtDecode } from 'jwt-decode';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { create } from 'zustand';

import { registrarManejadorSesionExpirada } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/auth-token';
import { queryClient } from '@/lib/query-client';
import { ROLES, type Rol } from '@/features/usuarios/types';

export interface UsuarioSesion {
  sub: number | string;
  email: string;
  roles: Rol[];
}

interface AuthState {
  token: string | null;
  user: UsuarioSesion | null;
  isAuthenticated: boolean;
  /** Guarda el token y abre la sesión. Si el token no es válido, deja la sesión cerrada. */
  login: (token: string) => void;
  /** Limpia la sesión y los datos en caché. Para redirigir a /login usar `useAuth().logout`. */
  logout: () => void;
}

/**
 * Decodifica el JWT. Solo lee su contenido (no verifica la firma: eso lo hace el
 * servidor en cada petición). Devuelve null si está mal formado, vencido o incompleto.
 */
export function leerSesion(token: string | null): UsuarioSesion | null {
  if (!token) return null;
  try {
    const payload = jwtDecode<{
      sub?: number | string;
      email?: unknown;
      roles?: unknown;
      exp?: number;
    }>(token);

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      return null;
    }
    if (
      payload.sub === undefined ||
      typeof payload.email !== 'string' ||
      !Array.isArray(payload.roles)
    ) {
      return null;
    }
    // Se descartan roles desconocidos: nunca habilitan nada en la UI.
    const roles = ROLES.filter((rol) => (payload.roles as unknown[]).includes(rol));
    return { sub: payload.sub, email: payload.email, roles };
  } catch {
    return null;
  }
}

const sinSesion = { token: null, user: null, isAuthenticated: false } as const;

/** Estado al cargar la app: toma el token guardado si sigue siendo válido; si no, lo descarta. */
export function crearEstadoInicial(): Pick<
  AuthState,
  'token' | 'user' | 'isAuthenticated'
> {
  const token = getToken();
  const user = leerSesion(token);
  if (!user) {
    if (token) clearToken();
    return { ...sinSesion };
  }
  return { token, user, isAuthenticated: true };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...crearEstadoInicial(),
  login: (token) => {
    const user = leerSesion(token);
    if (!user) {
      clearToken();
      set({ ...sinSesion });
      return;
    }
    setToken(token);
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    clearToken();
    // Evita que el siguiente usuario vea datos en caché del anterior.
    queryClient.clear();
    set({ ...sinSesion });
  },
}));

// Un 401 con token enviado = sesión vencida o usuario desactivado: se cierra y los guards
// de las rutas (que escuchan el store) llevan al login.
registrarManejadorSesionExpirada(() => {
  if (!useAuthStore.getState().isAuthenticated) return;
  useAuthStore.getState().logout();
  toast.info('Su sesión venció o ya no es válida. Inicie sesión nuevamente.');
});

export function useAuth() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const cerrarSesion = useAuthStore((s) => s.logout);

  const logout = useCallback(() => {
    cerrarSesion();
    navigate('/login', { replace: true });
  }, [cerrarSesion, navigate]);

  return { token, user, isAuthenticated, login, logout };
}
