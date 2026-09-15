import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import ErrorMessage from '../components/ErrorMessage.tsx'
import LoadingMessage from '../components/LoadingMessage.tsx'
import Page from '../components/Page.tsx'
import PageHeader from '../components/PageHeader.tsx'
import SaveScheduleForm from '../components/SaveScheduleForm.tsx'
import ScheduleCard from '../components/ScheduleCard.tsx'
import ScheduleNavigator from '../components/ScheduleNavigator.tsx'
import WeeklyCalendar from '../components/WeeklyCalendar.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { generateSchedules } from '../services/schedules.ts'
import { buttonClass, cardClass } from '../styles.ts'
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

export default function ResultsPage({ selectedCourses, preferences }: ResultsPageProps) {
  useDocumentTitle('Schedule Results')
  const [attempt, setAttempt] = useState(0) // goes up when the student clicks "Try again"
  const [result, setResult] = useState<GenerationResult | null>(null)

  // The schedule being shown is kept in the address (?schedule=3), so going to the login page to save it
  // and coming back returns to the same schedule. People count from 1; the array index counts from 0.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = Number.parseInt(searchParams.get('schedule') ?? '1', 10)
  const position = Number.isInteger(requested) && requested >= 1 ? requested - 1 : 0

  function showSchedule(nextPosition: number) {
    setSearchParams({ schedule: String(nextPosition + 1) }, { replace: true })
  }

  // Ask the backend for schedules when the page opens, and again after "Try again".
  useEffect(() => {
    if (selectedCourses.length === 0) {
      return
    }
    let ignore = false // set if the page closes or retries before this request finishes

    generateSchedules(buildGenerateRequest(selectedCourses, preferences))
      .then((response) => {
        if (!ignore) setResult({ attempt, kind: 'ready', response })
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
        <PageHeader title="Schedule Results" />
        <EmptyState
          title="No courses selected"
          message="Generated schedules are kept only until you refresh or leave the page. Search for courses to generate them again, or open a schedule you saved."
        >
          <Link to="/courses" className={buttonClass()}>
            Search courses
          </Link>
          <Link to="/dashboard" className={buttonClass('secondary')}>
            View saved schedules
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
      <PageHeader
        title="Schedule Results"
        description={
          <>
            <p>{selectedCourses.map((course) => course.course_code).join(', ')}</p>
            <p>Preferences: {preferenceDescriptions.length > 0 ? preferenceDescriptions.join(' · ') : 'none'}</p>
          </>
        }
        actions={
          <Link to="/planner" className={buttonClass('secondary', 'sm')}>
            Edit courses or preferences
          </Link>
        }
      />

      {current === null && <LoadingMessage>Generating schedules…</LoadingMessage>}

      {current?.kind === 'error' && (
        <ErrorMessage message={current.message} onRetry={() => setAttempt((previous) => previous + 1)} />
      )}

      {current?.kind === 'ready' && (
        <GeneratedResults response={current.response} position={position} onShowSchedule={showSchedule} />
      )}
    </Page>
  )
}

type GeneratedResultsProps = {
  response: GenerateSchedulesResponse
  position: number
  onShowSchedule: (position: number) => void
}

function GeneratedResults({ response, position, onShowSchedule }: GeneratedResultsProps) {
  const reason = emptyResultReason(response)

  return (
    <>
      <dl className={`mt-6 grid grid-cols-3 divide-x divide-slate-200 text-center ${cardClass}`}>
        <Count label="Section combinations" value={response.total_combinations} />
        <Count label="Without time conflicts" value={response.conflict_free_count} />
        <Count label="Match your preferences" value={response.count} />
      </dl>

      {reason === 'conflicts' && (
        <EmptyState
          title="These courses can't fit together"
          message={`Every one of the ${response.total_combinations} section combinations has a time conflict. Try removing a course or choosing a different one.`}
        >
          <Link to="/planner" className={buttonClass('secondary')}>
            Change courses
          </Link>
        </EmptyState>
      )}

      {reason === 'preferences' && (
        <EmptyState
          title="No schedules match your preferences"
          message={`${response.conflict_free_count} conflict-free ${response.conflict_free_count === 1 ? 'schedule exists' : 'schedules exist'}, but your preferences rule out all of them. Try loosening a preference.`}
        >
          <Link to="/planner" className={buttonClass('secondary')}>
            Edit preferences
          </Link>
        </EmptyState>
      )}

      {reason === null && (
        // A position from the address can be past the end (e.g. ?schedule=9 with 7 schedules), so clamp it.
        <ShownSchedule response={response} position={Math.min(position, response.count - 1)} onShowSchedule={onShowSchedule} />
      )}
    </>
  )
}

function ShownSchedule({ response, position, onShowSchedule }: GeneratedResultsProps) {
  // Only the schedule at `position` is rendered, even when the backend returned hundreds.
  const schedule = response.schedules[position]
  const scheduleLabel = `Schedule ${position + 1} of ${response.count}`

  return (
    <div className="mt-6">
      <ScheduleNavigator
        position={position}
        count={response.count}
        onPrevious={() => onShowSchedule(position - 1)}
        onNext={() => onShowSchedule(position + 1)}
      />
      {/* Phones: sections, calendar, save form (top to bottom).
          Large screens: the calendar on the left, the sections and save form stacked on the right. */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          <ScheduleCard schedule={schedule} />
        </div>
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <WeeklyCalendar schedule={schedule} />
        </div>
        <div className="lg:col-start-2 lg:row-start-2">
          {/* key={position} gives each schedule a fresh save form when the student moves to another one. */}
          <SaveScheduleForm
            key={position}
            schedule={schedule}
            returnTo={`/results?schedule=${position + 1}`}
            scheduleLabel={scheduleLabel}
          />
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
