import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import { saveSchedule } from '../services/savedSchedules.ts'
import type { SavedScheduleDetail } from '../types/savedSchedule.ts'
import type { GeneratedSchedule } from '../types/schedule.ts'

type SaveState =
  | { kind: 'editing'; error: string | null }
  | { kind: 'saving' }
  | { kind: 'saved'; saved: SavedScheduleDetail }

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 focus:outline-none'

/** Saves the schedule currently shown on the results page. */
export default function SaveScheduleForm({ schedule }: { schedule: GeneratedSchedule }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [semester, setSemester] = useState('')
  const [state, setState] = useState<SaveState>({ kind: 'editing', error: null })

  if (user === null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Save this schedule</h2>
        <p className="mt-1 text-sm text-slate-600">Log in to save schedules to your dashboard.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          {/* state.from brings the student back here; the generated results are still in memory. */}
          <Link to="/login" state={{ from: '/results' }} className="rounded-md bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800">
            Log in
          </Link>
          <Link to="/register" state={{ from: '/results' }} className="px-1 py-1.5 text-blue-700 hover:text-blue-900">
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
          <Link to={`/saved/${state.saved.id}`} className="text-emerald-900 underline hover:no-underline">
            Open saved schedule
          </Link>
          <Link to="/dashboard" className="text-emerald-900 underline hover:no-underline">
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
    <form noValidate onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Save this schedule</h2>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="save-name" className="block text-sm font-medium text-slate-800">
            Name
          </label>
          <input
            id="save-name"
            value={name}
            maxLength={100}
            placeholder="Fall 2027 - Friday Off"
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="save-semester" className="block text-sm font-medium text-slate-800">
            Semester
          </label>
          <input
            id="save-semester"
            value={semester}
            maxLength={20}
            placeholder="Fall 2027"
            onChange={(event) => setSemester(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {state.kind === 'editing' && state.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={state.kind === 'saving'}
        className="mt-4 w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {state.kind === 'saving' ? 'Saving…' : 'Save Schedule'}
      </button>
    </form>
  )
}
