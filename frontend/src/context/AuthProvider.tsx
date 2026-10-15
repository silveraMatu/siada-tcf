import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type LoginCredentials } from './AuthContext'
import type { AuthUser } from './types'

const DEMO_EMAIL = 'axelgaona@gmail.com'
const DEMO_PASSWORD = '1234'

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rol' in value &&
    typeof value.rol === 'string'
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const login = useCallback(async (credentials: LoginCredentials) => {
    // Credenciales de demostración disponibles únicamente durante desarrollo local.
    if (
      import.meta.env.DEV &&
      credentials.email.trim().toLocaleLowerCase() === DEMO_EMAIL &&
      credentials.password === DEMO_PASSWORD
    ) {
      const demoUser = { rol: 'usuario' }
      setUser(demoUser)
      return demoUser
    }

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida.')
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
          ? payload.message
          : `No se pudo iniciar sesión (HTTP ${response.status}).`
      throw new Error(message)
    }

    const result =
      typeof payload === 'object' && payload !== null && 'user' in payload
        ? payload.user
        : payload

    if (!isAuthUser(result)) {
      throw new Error('La respuesta de autenticación no contiene un usuario válido.')
    }

    setUser(result)
    return result
  }, [])

  const value = useMemo(() => ({ login, user }), [login, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
