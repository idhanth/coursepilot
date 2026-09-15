import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import Page from '../components/Page.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { buttonClass, cardClass, inputClass, labelClass, textLinkClass } from '../styles.ts'

export default function RegisterPage() {
  useDocumentTitle('Create an account')
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user !== null && !submitting) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim() === '' || email.trim() === '' || password === '') {
      setError('Fill in your name, email and password.')
      return
    }
    // Confirm Password (PRD §8) is only checked here; the backend receives one password.
    if (password !== confirmPassword) {
      setError("The passwords don't match.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate(from, { replace: true })
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Could not create the account.')
      setSubmitting(false)
    }
  }

  const fields = [
    { id: 'register-name', label: 'Name', type: 'text', autoComplete: 'name', value: name, onChange: setName },
    { id: 'register-email', label: 'Email', type: 'email', autoComplete: 'email', value: email, onChange: setEmail },
    { id: 'register-password', label: 'Password', type: 'password', autoComplete: 'new-password', value: password, onChange: setPassword },
    {
      id: 'register-confirm-password',
      label: 'Confirm password',
      type: 'password',
      autoComplete: 'new-password',
      value: confirmPassword,
      onChange: setConfirmPassword,
    },
  ]

  return (
    <Page narrow>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create an account</h1>
      <p className="mt-1 text-sm text-slate-600">Save the schedules you build and come back to them later.</p>

      {from.startsWith('/results') && (
        <p className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Create an account to save your schedule. Your courses stay selected, and you’ll return to the same schedule.
        </p>
      )}

      <form noValidate onSubmit={handleSubmit} className={`mt-6 space-y-4 p-5 ${cardClass}`}>
        {fields.map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className={labelClass}>
              {field.label}
            </label>
            <input
              id={field.id}
              type={field.type}
              autoComplete={field.autoComplete}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        ))}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={`w-full ${buttonClass()}`}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className={textLinkClass}>
          Log in
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
