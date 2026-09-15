import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import SaveScheduleForm from '../components/SaveScheduleForm.tsx'
import ScheduleCard from '../components/ScheduleCard.tsx'
import ScheduleNavigator from '../components/ScheduleNavigator.tsx'
import WeeklyCalendar from '../components/WeeklyCalendar.tsx'
import { generateSchedules } from '../services/schedules.ts'
import type { Course } from '../types/course.ts'
import type { GenerateSchedulesResponse, PreferenceForm } from '../types/schedule.ts'
import { buildGenerateRequest, describePreferences, emptyResultReason } from '../utils/schedule.ts'

type ResultsPageProps = {
  selectedCourses: Course[]
  preferences: PreferenceForm
}

// A finished request, remembering which attempt it belongs to.
type GenerationResult =
  | { attempt: number; kind: 'ready'; response: GenerateSchedulesResponse }
  | { attempt: number; kind: 'error'; message: string }

const linkButtonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'

export default function ResultsPage({ selectedCourses, preferences }: ResultsPageProps) {
  const [attempt, setAttempt] = useState(0) // goes up when the student clicks "Try again"
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [position, setPosition] = useState(0) // which schedule is shown, starting at 0

  // Ask the backend for schedules when the page opens, and again after "Try again".
  useEffect(() => {
    if (selectedCourses.length === 0) {
      return
    }
    let ignore = false // set if the page closes or retries before this request finishes

    generateSchedules(buildGenerateRequest(selectedCourses, preferences))
      .then((response) => {
        if (ignore) return
        setResult({ attempt, kind: 'ready', response })
        setPosition(0)
      })
      .catch((error: Error) => {
        if (!ignore) setResult({ attempt, kind: 'error', message: error.message })
      })

    return () => {
      ignore = true
    }
  }, [selectedCourses, preferences, attempt])

  if (selectedCourses.length === 0) {
    return (
      <Page>
        <EmptyState title="No courses selected" message="Search for the courses you want to take and add them first.">
          <Link to="/courses" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Search courses
          </Link>
        </EmptyState>
      </Page>
    )
  }

  // Until the result for the current attempt arrives, the page is loading.
  const current = result !== null && result.attempt === attempt ? result : null
  const preferenceDescriptions = describePreferences(preferences)

  return (
    <Page>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p>{selectedCourses.map((course) => course.course_code).join(', ')}</p>
          <p>Preferences: {preferenceDescriptions.length > 0 ? preferenceDescriptions.join(' · ') : 'none'}</p>
        </div>
        <Link to="/planner" className={linkButtonClass}>
          Edit courses or preferences
        </Link>
      </div>

      {current === null && (
        <p role="status" className="mt-8 text-sm text-slate-600">
          Generating schedules…
        </p>
      )}

      {current?.kind === 'error' && (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{current.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((previous) => previous + 1)}
            className="mt-2 font-medium text-red-900 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {current?.kind === 'ready' && (
        <GeneratedResults response={current.response} position={position} onPositionChange={setPosition} />
      )}
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Schedule Results</h1>
      {children}
    </main>
  )
}

type GeneratedResultsProps = {
  response: GenerateSchedulesResponse
  position: number
  onPositionChange: (position: number) => void
}

function GeneratedResults({ response, position, onPositionChange }: GeneratedResultsProps) {
  const reason = emptyResultReason(response)

  return (
    <>
      <dl className="mt-6 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white text-center shadow-sm">
        <Count label="Section combinations" value={response.total_combinations} />
        <Count label="Without time conflicts" value={response.conflict_free_count} />
        <Count label="Match your preferences" value={response.count} />
      </dl>

      {reason === 'conflicts' && (
        <EmptyState
          title="These courses can't fit together"
          message={`Every one of the ${response.total_combinations} section combinations has a time conflict. Try removing a course or choosing a different one.`}
        >
          <Link to="/planner" className={linkButtonClass}>
            Change courses
          </Link>
        </EmptyState>
      )}

      {reason === 'preferences' && (
        <EmptyState
          title="No schedules match your preferences"
          message={`${response.conflict_free_count} conflict-free ${response.conflict_free_count === 1 ? 'schedule exists' : 'schedules exist'}, but your preferences rule out all of them. Try loosening a preference.`}
        >
          <Link to="/planner" className={linkButtonClass}>
            Edit preferences
          </Link>
        </EmptyState>
      )}

      {reason === null && (
        <ShownSchedule response={response} position={Math.min(position, response.count - 1)} onPositionChange={onPositionChange} />
      )}
    </>
  )
}

function ShownSchedule({ response, position, onPositionChange }: GeneratedResultsProps) {
  // Only the schedule at `position` is rendered, even when the backend returned hundreds.
  const schedule = response.schedules[position]

  return (
    <div className="mt-6">
      <ScheduleNavigator
        position={position}
        count={response.count}
        onPrevious={() => onPositionChange(position - 1)}
        onNext={() => onPositionChange(position + 1)}
      />
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <WeeklyCalendar schedule={schedule} />
        {/* On small screens the text summary comes first; the calendar follows. */}
        <div className="order-first space-y-4 lg:order-none">
          <ScheduleCard schedule={schedule} />
          {/* key={position} gives each schedule a fresh save form when the student moves to another one. */}
          <SaveScheduleForm key={position} schedule={schedule} />
        </div>
      </div>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-xl font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
