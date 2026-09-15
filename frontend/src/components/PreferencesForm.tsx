import type { ReactNode } from 'react'
import { DAY_NAMES, EMPTY_PREFERENCES, type PreferenceForm } from '../types/schedule.ts'

type PreferencesFormProps = {
  value: PreferenceForm
  onChange: (value: PreferenceForm) => void
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 focus:outline-none'

// Weekend days are valid for the backend, but no sample course meets then, so only weekdays are offered.
const WEEKDAYS = DAY_NAMES.slice(0, 5)

export default function PreferencesForm({ value, onChange }: PreferencesFormProps) {
  // Copy the current values and replace one field. React needs a new object to notice the change.
  function update(field: keyof PreferenceForm, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="earliest-start" label="Earliest class start" hint="No class starts before this time.">
          <input
            id="earliest-start"
            type="time"
            value={value.earliestStart}
            onChange={(event) => update('earliestStart', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field id="latest-end" label="Latest class end" hint="No class ends after this time.">
          <input
            id="latest-end"
            type="time"
            value={value.latestEnd}
            onChange={(event) => update('latestEnd', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field id="day-off" label="Preferred day off" hint="No classes on this day.">
          <select
            id="day-off"
            value={value.preferredDayOff}
            onChange={(event) => update('preferredDayOff', event.target.value)}
            className={inputClass}
          >
            <option value="">No preference</option>
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Field>

        <Field id="max-classes" label="Maximum classes per day" hint="Counts every class meeting on a day.">
          <input
            id="max-classes"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="No limit"
            value={value.maxClassesPerDay}
            onChange={(event) => update('maxClassesPerDay', event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={() => onChange(EMPTY_PREFERENCES)}
        className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        Clear preferences
      </button>
    </div>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}
