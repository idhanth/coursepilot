import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext.ts'
import type { User } from '../types/auth.ts'

export const TEST_USER: User = { id: 1, name: 'Test Student', email: 'student@uga.edu', created_at: '2026-09-15T16:00:00Z' }

/** Wraps a page in a fake auth state, for tests of pages that only read who is logged in. */
export function withAuth(ui: ReactNode, overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    user: TEST_USER,
    checking: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
  return createElement(AuthContext.Provider, { value }, ui)
}
