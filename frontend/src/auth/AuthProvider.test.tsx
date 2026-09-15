import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.ts'
import { getCurrentUser, loginUser } from '../services/auth.ts'
import { getToken, setToken } from '../services/token.ts'
import { TEST_USER } from '../test/auth.ts'
import { useAuth } from './AuthContext.ts'
import AuthProvider from './AuthProvider.tsx'

vi.mock('../services/auth.ts', () => ({ loginUser: vi.fn(), registerUser: vi.fn(), getCurrentUser: vi.fn() }))
const mockLoginUser = vi.mocked(loginUser)
const mockGetCurrentUser = vi.mocked(getCurrentUser)

function Consumer() {
  const { user, checking, login, logout } = useAuth()
  return (
    <div>
      <p>{checking ? 'checking' : `user: ${user?.name ?? 'nobody'}`}</p>
      <button type="button" onClick={() => login('student@uga.edu', 'correct-horse-battery')}>
        log in
      </button>
      <button type="button" onClick={logout}>
        log out
      </button>
    </div>
  )
}

function renderProvider() {
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  )
}

beforeEach(() => {
  mockLoginUser.mockReset()
  mockGetCurrentUser.mockReset()
})

describe('AuthProvider', () => {
  it('starts logged out without calling the backend when no token is saved', () => {
    renderProvider()

    expect(screen.getByText('user: nobody')).toBeDefined()
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })

  it('restores the user from a saved token after a page refresh', async () => {
    setToken('saved-token')
    mockGetCurrentUser.mockResolvedValue(TEST_USER)

    renderProvider()

    expect(screen.getByText('checking')).toBeDefined()
    expect(await screen.findByText('user: Test Student')).toBeDefined()
  })

  it('forgets a saved token that the backend rejects', async () => {
    setToken('expired-token')
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Invalid or expired token.'))

    renderProvider()

    expect(await screen.findByText('user: nobody')).toBeDefined()
    expect(getToken()).toBeNull()
  })

  it('stores the JWT on login and forgets it on logout', async () => {
    mockLoginUser.mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    mockGetCurrentUser.mockResolvedValue(TEST_USER)
    renderProvider()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'log in' })))

    expect(screen.getByText('user: Test Student')).toBeDefined()
    expect(getToken()).toBe('new-token')

    fireEvent.click(screen.getByRole('button', { name: 'log out' }))

    expect(screen.getByText('user: nobody')).toBeDefined()
    expect(getToken()).toBeNull()
  })
})
