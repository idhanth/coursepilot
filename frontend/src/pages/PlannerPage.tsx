import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import PreferencesForm from '../components/PreferencesForm.tsx'
import type { Course } from '../types/course.ts'
import type { PreferenceForm } from '../types/schedule.ts'
import { validateScheduleRequest } from '../utils/schedule.ts'

type PlannerPageProps = {
  selectedCourses: Course[]
  onRemoveCourse: (courseId: number) => void
  preferences: PreferenceForm
  onPreferencesChange: (preferences: PreferenceForm) => void
}

export default function PlannerPage({ selectedCourses, onRemoveCourse, preferences, onPreferencesChange }: PlannerPageProps) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateScheduleRequest(selectedCourses, preferences)
    setFormError(error)
    if (error === null) {
      // The results page reads the same selection and preferences and asks the backend for schedules.
      navigate('/results')
    }
  }

  function handlePreferencesChange(next: PreferenceForm) {
    setFormError(null)
    onPreferencesChange(next)
  }

  if (selectedCourses.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Schedule Builder</h1>
        <EmptyState title="No courses selected" message="Search for the courses you want to take and add them first.">
          <Link to="/courses" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Search courses
          </Link>
        </EmptyState>
      </main>
    )
  }

  const totalCredits = selectedCourses.reduce((sum, course) => sum + course.credit_hours, 0)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Schedule Builder</h1>
      <p className="mt-1 text-sm text-slate-600">
        Review your courses, set any preferences, then generate every schedule that fits.
      </p>

      {/* grid-cols-1 lets the column shrink on phones instead of stretching to fit long course names. */}
      <form noValidate onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="planner-courses-heading" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="planner-courses-heading" className="font-semibold text-slate-900">
              Selected Courses
            </h2>
            <p className="text-sm text-slate-600">
              {selectedCourses.length} {selectedCourses.length === 1 ? 'course' : 'courses'} · {totalCredits} credits
            </p>
          </div>

          <ul className="mt-2 divide-y divide-slate-100">
            {selectedCourses.map((course) => (
              <li key={course.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{course.course_code}</p>
                  <p className="truncate text-sm text-slate-600">
                    {course.course_name} · {course.credit_hours} credits
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCourse(course.id)}
                  aria-label={`Remove ${course.course_code}`}
                  className="shrink-0 text-sm font-medium text-red-700 hover:text-red-900"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <Link to="/courses" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:text-blue-900">
            Add more courses
          </Link>
        </section>

        <section aria-labelledby="preferences-heading" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="preferences-heading" className="font-semibold text-slate-900">
            Preferences
          </h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">Optional. Leave a field empty to allow anything.</p>
          <PreferencesForm value={preferences} onChange={handlePreferencesChange} />
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
          {formError && (
            <p role="alert" className="text-sm text-red-700">
              {formError}
            </p>
          )}
          <button type="submit" className="rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Generate Schedules
          </button>
        </div>
      </form>
    </main>
  )
}
