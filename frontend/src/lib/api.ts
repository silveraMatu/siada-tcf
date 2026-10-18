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
