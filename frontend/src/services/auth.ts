import type { TokenResponse, User } from '../types/auth.ts'
import { apiGet, apiPost } from './api.ts'

export function registerUser(name: string, email: string, password: string): Promise<User> {
  return apiPost<User>('/api/auth/register', { name, email, password })
}

export function loginUser(email: string, password: string): Promise<TokenResponse> {
  return apiPost<TokenResponse>('/api/auth/login', { email, password })
}

/** Asks the backend who the saved token belongs to. */
export function getCurrentUser(): Promise<User> {
  return apiGet<User>('/api/auth/me', { auth: true })
}
