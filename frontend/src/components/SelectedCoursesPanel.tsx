import type { Course } from '../types/course.ts'

type SelectedCoursesPanelProps = {
  courses: Course[]
  onRemove: (courseId: number) => void
  onClear: () => void
}

export default function SelectedCoursesPanel({ courses, onRemove, onClear }: SelectedCoursesPanelProps) {
  return (
    // order-first puts this panel above the results on small screens; on large screens it sits on the right.
    <aside
      aria-labelledby="selected-courses-heading"
      className="order-first rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:order-none"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="selected-courses-heading" className="font-semibold text-slate-900">
          Selected Courses <span className="font-normal text-slate-500">({courses.length})</span>
        </h2>
        {courses.length > 0 && (
          <button type="button" onClick={onClear} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Clear
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No courses selected yet. Choose <span className="font-medium">Add</span> on a course to include it.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {courses.map((course) => (
            <li key={course.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{course.course_code}</p>
                <p className="truncate text-sm text-slate-600">{course.course_name}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(course.id)}
                aria-label={`Remove ${course.course_code}`}
                className="shrink-0 text-sm font-medium text-red-700 hover:text-red-900"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
