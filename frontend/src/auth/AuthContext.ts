import { createContext, useContext } from 'react'
import type { User } from '../types/auth.ts'

export type AuthContextValue = {
  user: User | null // null when nobody is logged in
  checking: boolean // true while a token saved by an earlier visit is being checked with /api/auth/me
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** The current user and the login, register and logout functions, from the nearest AuthProvider. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return value
}
