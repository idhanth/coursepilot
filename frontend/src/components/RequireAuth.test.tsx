import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { withAuth } from '../test/auth.ts'
import RequireAuth from './RequireAuth.tsx'

function LoginMarker() {
  const location = useLocation()
  return <p>Login page, from {(location.state as { from?: string } | null)?.from}</p>
}

function renderProtected(auth: Parameters<typeof withAuth>[1]) {
  render(
    withAuth(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <p>Secret dashboard</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginMarker />} />
        </Routes>
      </MemoryRouter>,
      auth,
    ),
  )
}

describe('RequireAuth', () => {
  it('redirects a logged-out visitor to /login and remembers where they were going', () => {
    renderProtected({ user: null })

    expect(screen.getByText('Login page, from /dashboard')).toBeDefined()
    expect(screen.queryByText('Secret dashboard')).toBeNull()
  })

  it('waits while a saved token is still being checked', () => {
    renderProtected({ user: null, checking: true })

    expect(screen.getByText('Checking your login…')).toBeDefined()
    expect(screen.queryByText(/Login page/)).toBeNull()
  })

  it('shows the page to a logged-in user', () => {
    renderProtected({})

    expect(screen.getByText('Secret dashboard')).toBeDefined()
  })
})
