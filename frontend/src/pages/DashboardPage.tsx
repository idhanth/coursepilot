import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import EmptyState from '../components/EmptyState.tsx'
import ErrorMessage from '../components/ErrorMessage.tsx'
import LoadingMessage from '../components/LoadingMessage.tsx'
import Page from '../components/Page.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { deleteSavedSchedule, listSavedSchedules } from '../services/savedSchedules.ts'
import { buttonClass, cardClass } from '../styles.ts'
import type { SavedScheduleSummary } from '../types/savedSchedule.ts'
import { formatDate } from '../utils/format.ts'

export default function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user, logout } = useAuth()
  const [attempt, setAttempt] = useState(0) // goes up when the student clicks "Try again"
  const [schedules, setSchedules] = useState<SavedScheduleSummary[] | null>(null) // null until loaded
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    listSavedSchedules()
      .then((saved) => {
        if (!ignore) setSchedules(saved)
      })
      .catch((error: Error) => {
        if (!ignore) setLoadError(error.message)
      })
    return () => {
      ignore = true
    }
  }, [attempt])

  function retryLoading() {
    setLoadError(null)
    setAttempt((previous) => previous + 1)
  }

  async function handleDelete(schedule: SavedScheduleSummary) {
    if (!window.confirm(`Delete “${schedule.name}”? This can't be undone.`)) {
      return
    }
    setDeleteError(null)
    try {
      await deleteSavedSchedule(schedule.id)
      setSchedules((current) => (current ?? []).filter((saved) => saved.id !== schedule.id))
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete the schedule.')
    }
  }

  if (user === null) {
    return null // RequireAuth only shows this page to a logged-in user
  }

  return (
    <Page>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={user.email}
        actions={
          <>
            <Link to="/courses" className={buttonClass()}>
              Build New Schedule
            </Link>
            <button type="button" onClick={logout} className={buttonClass('secondary')}>
              Log out
            </button>
          </>
        }
      />

      <section aria-labelledby="saved-heading" className="mt-8 max-w-3xl">
        <h2 id="saved-heading" className="text-lg font-semibold text-slate-900">
          Saved Schedules
        </h2>

        {deleteError && <ErrorMessage message={deleteError} />}
        {loadError && <ErrorMessage message={loadError} onRetry={retryLoading} />}

        {schedules === null && loadError === null && <LoadingMessage>Loading saved schedules…</LoadingMessage>}

        {schedules !== null && schedules.length === 0 && (
          <EmptyState title="No saved schedules yet" message="Generate schedules for your courses and save the ones you like.">
            <Link to="/courses" className={buttonClass()}>
              Build New Schedule
            </Link>
          </EmptyState>
        )}

        {schedules !== null && schedules.length > 0 && (
          <ul className="mt-4 space-y-3">
            {schedules.map((schedule) => (
              <li key={schedule.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${cardClass}`}>
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
                    className={buttonClass('secondary', 'sm')}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule)}
                    aria-label={`Delete ${schedule.name}`}
                    className={buttonClass('danger', 'sm')}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  )
}
