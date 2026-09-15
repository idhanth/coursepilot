import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import EmptyState from '../components/EmptyState.tsx'
import { deleteSavedSchedule, listSavedSchedules } from '../services/savedSchedules.ts'
import type { SavedScheduleSummary } from '../types/savedSchedule.ts'
import { formatDate } from '../utils/format.ts'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [schedules, setSchedules] = useState<SavedScheduleSummary[] | null>(null) // null until loaded
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    listSavedSchedules()
      .then((saved) => {
        if (!ignore) setSchedules(saved)
      })
      .catch((loadError: Error) => {
        if (!ignore) setError(loadError.message)
      })
    return () => {
      ignore = true
    }
  }, [])

  async function handleDelete(schedule: SavedScheduleSummary) {
    if (!window.confirm(`Delete “${schedule.name}”? This can't be undone.`)) {
      return
    }
    setError(null)
    try {
      await deleteSavedSchedule(schedule.id)
      setSchedules((current) => (current ?? []).filter((saved) => saved.id !== schedule.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete the schedule.')
    }
  }

  if (user === null) {
    return null // RequireAuth only shows this page to a logged-in user
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/courses" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Build New Schedule
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>

      <section aria-labelledby="saved-heading" className="mt-8">
        <h2 id="saved-heading" className="text-lg font-semibold text-slate-900">
          Saved Schedules
        </h2>

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {schedules === null && error === null && <p className="mt-3 text-sm text-slate-600">Loading saved schedules…</p>}

        {schedules !== null && schedules.length === 0 && (
          <EmptyState title="No saved schedules yet" message="Generate schedules for your courses and save the ones you like.">
            <Link to="/courses" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Build New Schedule
            </Link>
          </EmptyState>
        )}

        {schedules !== null && schedules.length > 0 && (
          <ul className="mt-3 space-y-3">
            {schedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{schedule.name}</p>
                  <p className="text-sm text-slate-600">
                    {schedule.semester} · {schedule.total_credits} credits · Saved {formatDate(schedule.created_at)}
                  </p>
                  <p className="text-sm text-slate-500">{schedule.course_codes.join(' · ')}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/saved/${schedule.id}`}
                    aria-label={`Open ${schedule.name}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule)}
                    aria-label={`Delete ${schedule.name}`}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
