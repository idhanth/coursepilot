import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import { saveSchedule } from '../services/savedSchedules.ts'
import { buttonClass, cardClass, inputClass, labelClass, textLinkClass } from '../styles.ts'
import type { SavedScheduleDetail } from '../types/savedSchedule.ts'
import type { GeneratedSchedule } from '../types/schedule.ts'

type SaveState =
  | { kind: 'editing'; error: string | null }
  | { kind: 'saving' }
  | { kind: 'saved'; saved: SavedScheduleDetail }

type SaveScheduleFormProps = {
  schedule: GeneratedSchedule
  returnTo: string // where to come back to after logging in, e.g. "/results?schedule=3"
  scheduleLabel: string // e.g. "Schedule 3 of 7"
}

/** Saves the schedule currently shown on the results page. */
export default function SaveScheduleForm({ schedule, returnTo, scheduleLabel }: SaveScheduleFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [semester, setSemester] = useState('')
  const [state, setState] = useState<SaveState>({ kind: 'editing', error: null })

  if (user === null) {
    return (
      <div className={`${cardClass} p-4`}>
        <h2 className="font-semibold text-slate-900">Save this schedule</h2>
        <p className="mt-1 text-sm text-slate-600">
          Log in to save {scheduleLabel.toLowerCase()} to your dashboard. Your courses stay selected, and you’ll come
          right back to this schedule.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <Link to="/login" state={{ from: returnTo }} className={buttonClass('primary', 'sm')}>
            Log in
          </Link>
          <Link to="/register" state={{ from: returnTo }} className={textLinkClass}>
            Create an account
          </Link>
        </div>
      </div>
    )
  }

  if (state.kind === 'saved') {
    return (
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Saved “{state.saved.name}”.</p>
        <div className="mt-2 flex flex-wrap gap-4 font-medium">
          <Link to={`/saved/${state.saved.id}`} className="rounded text-emerald-900 underline hover:no-underline">
            Open saved schedule
          </Link>
          <Link to="/dashboard" className="rounded text-emerald-900 underline hover:no-underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim() === '' || semester.trim() === '') {
      setState({ kind: 'editing', error: 'Enter a name and a semester.' })
      return
    }
    setState({ kind: 'saving' })
    try {
      const saved = await saveSchedule({
        name: name.trim(),
        semester: semester.trim(),
        // The exact sections on screen; nothing is regenerated.
        section_ids: schedule.sections.map((section) => section.id),
      })
      setState({ kind: 'saved', saved })
    } catch (error) {
      setState({ kind: 'editing', error: error instanceof Error ? error.message : 'Could not save the schedule.' })
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className={`${cardClass} p-4`}>
      <h2 className="font-semibold text-slate-900">Save this schedule</h2>
      <p className="mt-1 text-xs text-slate-500">Generated schedules disappear if you refresh or close the page until you save one.</p>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="save-name" className={labelClass}>
            Name
          </label>
          <input
            id="save-name"
            value={name}
            maxLength={100}
            placeholder="Fall 2027 - Friday Off"
            onChange={(event) => setName(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="save-semester" className={labelClass}>
            Semester
          </label>
          <input
            id="save-semester"
            value={semester}
            maxLength={20}
            placeholder="Fall 2027"
            onChange={(event) => setSemester(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>

      {state.kind === 'editing' && state.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={state.kind === 'saving'} className={`mt-4 w-full ${buttonClass()}`}>
        {state.kind === 'saving' ? 'Saving…' : 'Save Schedule'}
      </button>
    </form>
  )
}
