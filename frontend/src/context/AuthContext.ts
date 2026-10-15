import { createContext } from 'react'
import type { AuthUser } from './types'

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthContextValue = {
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  user: AuthUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
