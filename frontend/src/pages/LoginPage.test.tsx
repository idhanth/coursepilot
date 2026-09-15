import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider.tsx'
import { ApiError } from '../services/api.ts'
import { getCurrentUser, loginUser } from '../services/auth.ts'
import { getToken } from '../services/token.ts'
import { TEST_USER } from '../test/auth.ts'
import LoginPage from './LoginPage.tsx'

vi.mock('../services/auth.ts', () => ({ loginUser: vi.fn(), registerUser: vi.fn(), getCurrentUser: vi.fn() }))
const mockLoginUser = vi.mocked(loginUser)
const mockGetCurrentUser = vi.mocked(getCurrentUser)

function renderLogin(entry: InitialEntry = '/login') {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
          <Route path="/results" element={<p>Results page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

beforeEach(() => {
  mockLoginUser.mockReset()
  mockGetCurrentUser.mockReset()
})

describe('LoginPage', () => {
  it('logs in, stores the JWT and opens the dashboard', async () => {
    mockLoginUser.mockResolvedValue({ access_token: 'jwt-from-backend', token_type: 'bearer' })
    mockGetCurrentUser.mockResolvedValue(TEST_USER)
    renderLogin()

    fillAndSubmit(' student@uga.edu ', 'correct-horse-battery')

    expect(await screen.findByText('Dashboard page')).toBeDefined()
    expect(mockLoginUser).toHaveBeenCalledWith('student@uga.edu', 'correct-horse-battery')
    expect(getToken()).toBe('jwt-from-backend')
  })

  it('shows the backend error and stores nothing when login fails', async () => {
    mockLoginUser.mockRejectedValue(new ApiError(401, 'Incorrect email or password.'))
    renderLogin()

    fillAndSubmit('student@uga.edu', 'wrong-password')

    expect((await screen.findByRole('alert')).textContent).toBe('Incorrect email or password.')
    expect(getToken()).toBeNull()
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
    expect(screen.queryByText('Dashboard page')).toBeNull()
  })

  it('asks for both fields before calling the backend', () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('alert').textContent).toBe('Enter your email and password.')
    expect(mockLoginUser).not.toHaveBeenCalled()
  })

  it('returns to the page that sent the user to log in', async () => {
    mockLoginUser.mockResolvedValue({ access_token: 'jwt-from-backend', token_type: 'bearer' })
    mockGetCurrentUser.mockResolvedValue(TEST_USER)
    renderLogin({ pathname: '/login', state: { from: '/results' } })

    fillAndSubmit('student@uga.edu', 'correct-horse-battery')

    expect(await screen.findByText('Results page')).toBeDefined()
  })
})
