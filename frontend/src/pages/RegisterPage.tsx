import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 focus:outline-none'

export default function RegisterPage() {
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
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Create an account</h1>
      <p className="mt-1 text-sm text-slate-600">Save the schedules you build and come back to them later.</p>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {fields.map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="block text-sm font-medium text-slate-800">
              {field.label}
            </label>
            <input
              id={field.id}
              type={field.type}
              autoComplete={field.autoComplete}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              className={inputClass}
            />
          </div>
        ))}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-medium text-blue-700 hover:text-blue-900">
          Log in
        </Link>
      </p>
    </main>
  )
}
