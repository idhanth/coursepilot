import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, setUnauthorizedHandler } from '../services/api.ts'
import { getCurrentUser, loginUser, registerUser } from '../services/auth.ts'
import { clearToken, getToken, setToken } from '../services/token.ts'
import type { User } from '../types/auth.ts'
import { AuthContext } from './AuthContext.ts'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Only check with the backend if an earlier visit left a token behind.
  const [checking, setChecking] = useState(() => getToken() !== null)

  // On page load, turn a saved token back into a user by asking the backend who it belongs to.
  useEffect(() => {
    if (getToken() === null) {
      return
    }
    let ignore = false
    getCurrentUser()
      .then((currentUser) => {
        if (!ignore) setUser(currentUser)
      })
      .catch((error: unknown) => {
        // A rejected token is forgotten. Other errors (e.g. the server is down) keep it for next time.
        if (!ignore && error instanceof ApiError && error.status === 401) clearToken()
      })
      .finally(() => {
        if (!ignore) setChecking(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // If any protected request is rejected with 401, api.ts forgets the token and calls this.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  async function login(email: string, password: string) {
    const { access_token } = await loginUser(email, password)
    setToken(access_token)
    try {
      setUser(await getCurrentUser())
    } catch (error) {
      clearToken()
      throw error
    }
  }

  async function register(name: string, email: string, password: string) {
    await registerUser(name, email, password)
    await login(email, password) // log the new account in straight away
  }

  function logout() {
    // The JWT isn't stored on the server, so logging out means forgetting it here.
    clearToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, checking, login, register, logout }}>{children}</AuthContext.Provider>
}
