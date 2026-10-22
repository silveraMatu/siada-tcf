import axios, { isAxiosError } from 'axios';

import { getToken } from './auth-token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
});

// Adjunta el JWT a cada petición. Los endpoints públicos lo ignoran.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let alExpirarSesion: (() => void) | null = null;

/**
 * Registra qué hacer cuando el servidor rechaza con 401 una petición que llevaba token (vencido,
 * usuario desactivado, etc.). Lo registra la capa de autenticación: este módulo no la importa.
 */
export function registrarManejadorSesionExpirada(
  manejador: (() => void) | null,
) {
  alExpirarSesion = manejador;
}

// El 401 de /auth/* es de las credenciales (login fallido), no de una sesión vencida.
api.interceptors.response.use(undefined, (error: unknown) => {
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.headers?.Authorization &&
    !error.config.url?.startsWith('/auth/')
  ) {
    alExpirarSesion?.();
  }
  return Promise.reject(error);
});

/** Extrae el mensaje de error que devuelve la API (NestJS) o uno genérico. */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    // Los 400 de validación (Zod) traen el detalle en `errors[].message`.
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors
        .map((e: { message?: string }) => e.message)
        .filter(Boolean)
        .join('. ');
    }
    const message = data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
    if (!error.response) return 'No se pudo conectar con el servidor';
  }
  return error instanceof Error ? error.message : 'Error inesperado';
}
