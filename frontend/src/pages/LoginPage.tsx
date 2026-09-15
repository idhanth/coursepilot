import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import Page from '../components/Page.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { buttonClass, cardClass, inputClass, labelClass, textLinkClass } from '../styles.ts'

export default function LoginPage() {
  useDocumentTitle('Log in')
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // After logging in, go back to the page that asked for it (e.g. /results?schedule=3), or to the dashboard.
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user !== null && !submitting) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim() === '' || password === '') {
      setError('Enter your email and password.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not log in.')
      setSubmitting(false)
    }
  }

  return (
    <Page narrow>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Log in to save schedules and see your dashboard.</p>

      {from.startsWith('/results') && (
        <p className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Log in to save your schedule. Your courses stay selected, and you’ll return to the same schedule.
        </p>
      )}

      <form noValidate onSubmit={handleSubmit} className={`mt-6 space-y-4 p-5 ${cardClass}`}>
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={`w-full ${buttonClass()}`}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" state={location.state} className={textLinkClass}>
          Create one
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        Just browsing?{' '}
        <Link to="/courses" className={textLinkClass}>
          Search courses without an account
        </Link>
      </p>
    </Page>
  )
}
