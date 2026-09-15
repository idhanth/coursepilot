import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import ErrorMessage from '../components/ErrorMessage.tsx'
import LoadingMessage from '../components/LoadingMessage.tsx'
import Page from '../components/Page.tsx'
import PageHeader from '../components/PageHeader.tsx'
import ScheduleCard from '../components/ScheduleCard.tsx'
import WeeklyCalendar from '../components/WeeklyCalendar.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { ApiError } from '../services/api.ts'
import { deleteSavedSchedule, getSavedSchedule } from '../services/savedSchedules.ts'
import { buttonClass, textLinkClass } from '../styles.ts'
import type { SavedScheduleDetail } from '../types/savedSchedule.ts'
import { formatDate } from '../utils/format.ts'

// A finished request, remembering which id and attempt it was for.
type Loaded =
  | { key: string; kind: 'ready'; schedule: SavedScheduleDetail }
  | { key: string; kind: 'not-found' }
  | { key: string; kind: 'error'; message: string }

export default function SavedSchedulePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const validId = /^[1-9]\d{0,9}$/.test(id)
  const [attempt, setAttempt] = useState(0) // goes up when the student clicks "Try again"
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const key = `${id}#${attempt}`

  useEffect(() => {
    if (!validId) {
      return
    }
    let ignore = false
    const requestKey = `${id}#${attempt}`
    getSavedSchedule(Number(id))
      .then((schedule) => {
        if (!ignore) setLoaded({ key: requestKey, kind: 'ready', schedule })
      })
      .catch((error: unknown) => {
        if (ignore) return
        // 404 means it doesn't exist or belongs to another account; the page shows both the same way.
        if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
          setLoaded({ key: requestKey, kind: 'not-found' })
        } else {
          setLoaded({
            key: requestKey,
            kind: 'error',
            message: error instanceof Error ? error.message : 'Could not load the schedule.',
          })
        }
      })
    return () => {
      ignore = true
    }
  }, [id, validId, attempt])

  const current: Loaded | null = !validId ? { key, kind: 'not-found' } : loaded?.key === key ? loaded : null
  useDocumentTitle(current?.kind === 'ready' ? current.schedule.name : 'Saved Schedule')

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
    <Page>
      <Link to="/dashboard" className={`text-sm ${textLinkClass}`}>
        ← Back to dashboard
      </Link>

      {current === null && <LoadingMessage>Loading saved schedule…</LoadingMessage>}

      {current?.kind === 'not-found' && (
        <EmptyState title="Saved schedule not found" message="It may have been deleted, or it isn't one of your saved schedules.">
          <Link to="/dashboard" className={buttonClass()}>
            Go to dashboard
          </Link>
        </EmptyState>
      )}

      {current?.kind === 'error' && (
        <ErrorMessage message={current.message} onRetry={() => setAttempt((previous) => previous + 1)} />
      )}

      {current?.kind === 'ready' && (
        <>
          <div className="mt-4">
            <PageHeader
              title={current.schedule.name}
              description={`${current.schedule.semester} · ${current.schedule.total_credits} credits · Saved ${formatDate(current.schedule.created_at)}`}
              actions={
                <button type="button" onClick={() => handleDelete(current.schedule)} className={buttonClass('danger', 'sm')}>
                  Delete
                </button>
              }
            />
          </div>

          {deleteError && <ErrorMessage message={deleteError} />}

          {/* The same section list and calendar as the results page: sections first on phones. */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="lg:col-start-2 lg:row-start-1">
              <ScheduleCard schedule={current.schedule} />
            </div>
            <div className="lg:col-start-1 lg:row-start-1">
              <WeeklyCalendar schedule={current.schedule} />
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
