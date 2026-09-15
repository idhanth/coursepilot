import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import LoadingMessage from './LoadingMessage.tsx'
import Page from './Page.tsx'

/** Shows its children only to a logged-in user; everyone else is sent to /login and brought back afterwards. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth()
  const location = useLocation()

  if (checking) {
    // Wait for /api/auth/me before deciding, so a refresh doesn't bounce a logged-in user to /login.
    return (
      <Page>
        <LoadingMessage>Checking your login…</LoadingMessage>
      </Page>
    )
  }
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
