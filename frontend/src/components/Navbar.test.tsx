import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../auth/AuthContext.ts'
import { withAuth } from '../test/auth.ts'
import Navbar from './Navbar.tsx'

function renderNavbar(auth: Partial<AuthContextValue>) {
  render(withAuth(<MemoryRouter><Navbar selectedCount={0} /></MemoryRouter>, auth))
}

describe('Navbar', () => {
  it('shows Dashboard and a working Log out to a logged-in user', () => {
    const logout = vi.fn()
    renderNavbar({ logout })

    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/dashboard')
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledOnce()
  })

  it('shows Log in and Register to a visitor, but neither set of links while a saved token is being checked', () => {
    renderNavbar({ user: null })
    expect(screen.getByRole('link', { name: 'Log in' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Register' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()

    cleanup()
    renderNavbar({ user: null, checking: true })
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull()
  })
})
