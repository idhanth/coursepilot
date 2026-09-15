import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider.tsx'
import { ApiError } from '../services/api.ts'
import { getCurrentUser, loginUser, registerUser } from '../services/auth.ts'
import { getToken } from '../services/token.ts'
import { TEST_USER } from '../test/auth.ts'
import RegisterPage from './RegisterPage.tsx'

vi.mock('../services/auth.ts', () => ({ loginUser: vi.fn(), registerUser: vi.fn(), getCurrentUser: vi.fn() }))
const mockRegisterUser = vi.mocked(registerUser)
const mockLoginUser = vi.mocked(loginUser)
const mockGetCurrentUser = vi.mocked(getCurrentUser)

function renderRegister() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function fill(values: { name: string; email: string; password: string; confirm: string }) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: values.name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: values.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: values.password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: values.confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

const VALID = { name: 'Test Student', email: 'student@uga.edu', password: 'correct-horse-battery', confirm: 'correct-horse-battery' }

beforeEach(() => {
  mockRegisterUser.mockReset()
  mockLoginUser.mockReset()
  mockGetCurrentUser.mockReset()
})

describe('RegisterPage', () => {
  it('creates the account, logs it in and opens the dashboard', async () => {
    mockRegisterUser.mockResolvedValue(TEST_USER)
    mockLoginUser.mockResolvedValue({ access_token: 'new-account-token', token_type: 'bearer' })
    mockGetCurrentUser.mockResolvedValue(TEST_USER)
    renderRegister()

    fill(VALID)

    expect(await screen.findByText('Dashboard page')).toBeDefined()
    expect(mockRegisterUser).toHaveBeenCalledWith('Test Student', 'student@uga.edu', 'correct-horse-battery')
    expect(mockLoginUser).toHaveBeenCalledWith('student@uga.edu', 'correct-horse-battery')
    expect(getToken()).toBe('new-account-token')
  })

  it('stops when the two passwords differ', () => {
    renderRegister()

    fill({ ...VALID, confirm: 'something-else' })

    expect(screen.getByRole('alert').textContent).toBe("The passwords don't match.")
    expect(mockRegisterUser).not.toHaveBeenCalled()
  })

  it('shows the backend error for an email that is already registered', async () => {
    mockRegisterUser.mockRejectedValue(new ApiError(409, 'An account with this email already exists.'))
    renderRegister()

    fill(VALID)

    expect((await screen.findByRole('alert')).textContent).toBe('An account with this email already exists.')
    expect(mockLoginUser).not.toHaveBeenCalled()
    expect(getToken()).toBeNull()
  })
})
