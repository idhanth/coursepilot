import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import ScheduleCard from '../components/ScheduleCard.tsx'
import WeeklyCalendar from '../components/WeeklyCalendar.tsx'
import { ApiError } from '../services/api.ts'
import { deleteSavedSchedule, getSavedSchedule } from '../services/savedSchedules.ts'
import type { SavedScheduleDetail } from '../types/savedSchedule.ts'
import { formatDate } from '../utils/format.ts'

// A finished request, remembering which id it was for.
type Loaded =
  | { id: string; kind: 'ready'; schedule: SavedScheduleDetail }
  | { id: string; kind: 'not-found' }
  | { id: string; kind: 'error'; message: string }

export default function SavedSchedulePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const validId = /^[1-9]\d{0,9}$/.test(id)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!validId) {
      return
    }
    let ignore = false
    getSavedSchedule(Number(id))
      .then((schedule) => {
        if (!ignore) setLoaded({ id, kind: 'ready', schedule })
      })
      .catch((error: unknown) => {
        if (ignore) return
        // 404 means it doesn't exist or belongs to another account; the page shows both the same way.
        if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
          setLoaded({ id, kind: 'not-found' })
        } else {
          setLoaded({ id, kind: 'error', message: error instanceof Error ? error.message : 'Could not load the schedule.' })
        }
      })
    return () => {
      ignore = true
    }
  }, [id, validId])

  const current: Loaded | null = !validId ? { id, kind: 'not-found' } : loaded?.id === id ? loaded : null

  async function handleDelete(schedule: SavedScheduleDetail) {
    if (!window.confirm(`Delete “${schedule.name}”? This can't be undone.`)) {
      return
    }
    try {
      await deleteSavedSchedule(schedule.id)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete the schedule.')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/dashboard" className="text-sm font-medium text-blue-700 hover:text-blue-900">
        ← Back to dashboard
      </Link>

      {current === null && <p className="mt-6 text-sm text-slate-600">Loading saved schedule…</p>}

      {current?.kind === 'not-found' && (
        <EmptyState
          title="Saved schedule not found"
          message="It may have been deleted, or it isn't one of your saved schedules."
        >
          <Link to="/dashboard" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Go to dashboard
          </Link>
        </EmptyState>
      )}

      {current?.kind === 'error' && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {current.message}
        </p>
      )}

      {current?.kind === 'ready' && (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{current.schedule.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {current.schedule.semester} · {current.schedule.total_credits} credits · Saved{' '}
                {formatDate(current.schedule.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(current.schedule)}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>

          {deleteError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {deleteError}
            </p>
          )}

          {/* The same calendar and section list as the results page. */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <WeeklyCalendar schedule={current.schedule} />
            <div className="order-first lg:order-none">
              <ScheduleCard schedule={current.schedule} />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
