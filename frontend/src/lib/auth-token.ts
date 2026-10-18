export const TOKEN_KEY = 'siada_token';

// localStorage puede lanzar (modo privado, datos bloqueados): la app debe seguir funcionando.
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sin almacenamiento disponible: la sesión no podrá persistir.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nada que limpiar.
  }
}
