import { useEffect, useState, type FormEvent } from 'react'
import CourseCard from '../components/CourseCard.tsx'
import SelectedCoursesPanel from '../components/SelectedCoursesPanel.tsx'
import { listCourses, searchCourses } from '../services/courses.ts'
import type { Course } from '../types/course.ts'

// A finished search, remembering which query it was for.
type SearchResult = { query: string; kind: 'ready'; courses: Course[] } | { query: string; kind: 'error'; message: string }

export default function CourseSearchPage() {
  const [input, setInput] = useState('') // what is typed in the search box
  const [submittedQuery, setSubmittedQuery] = useState('') // the last search submitted; '' means all courses
  const [result, setResult] = useState<SearchResult | null>(null)
  // The temporary course selection. It lives only in this page's state for now.
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([])

  // Runs when the page first loads and again whenever a new search is submitted.
  useEffect(() => {
    // If a newer search starts before this request finishes, its outdated response is ignored.
    let ignore = false

    const request = submittedQuery === '' ? listCourses() : searchCourses(submittedQuery)
    request
      .then((courses) => {
        if (!ignore) setResult({ query: submittedQuery, kind: 'ready', courses })
      })
      .catch((error: Error) => {
        if (!ignore) setResult({ query: submittedQuery, kind: 'error', message: error.message })
      })

    return () => {
      ignore = true
    }
  }, [submittedQuery])

  // Until a result for the current query arrives, the page shows "Loading".
  const current = result !== null && result.query === submittedQuery ? result : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser from reloading the page
    setSubmittedQuery(input.trim())
  }

  function showAllCourses() {
    setInput('')
    setSubmittedQuery('')
  }

  function addCourse(course: Course) {
    setSelectedCourses((selected) =>
      selected.some((existing) => existing.id === course.id) ? selected : [...selected, course],
    )
  }

  function removeCourse(courseId: number) {
    setSelectedCourses((selected) => selected.filter((course) => course.id !== courseId))
  }

  function clearSelection() {
    setSelectedCourses([])
  }

  const selectedIds = new Set(selectedCourses.map((course) => course.id))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Search Courses</h1>
      <p className="mt-1 text-sm text-slate-600">
        Search by course code, course name, or department, then add the courses you want to take.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-label="Course results">
          <form role="search" onSubmit={handleSubmit} className="flex gap-2">
            <label htmlFor="course-search" className="sr-only">
              Search courses
            </label>
            <input
              id="course-search"
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. CSCI, Software Development, Mathematics"
              maxLength={100}
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              Search
            </button>
          </form>

          {current === null && <p className="mt-6 text-sm text-slate-500">Loading courses…</p>}

          {current?.kind === 'error' && (
            <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {current.message}
            </p>
          )}

          {current?.kind === 'ready' && (
            <>
              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-slate-600">{resultSummary(current.courses.length, submittedQuery)}</p>
                {submittedQuery !== '' && (
                  <button
                    type="button"
                    onClick={showAllCourses}
                    className="text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    Show all courses
                  </button>
                )}
              </div>

              {current.courses.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
                  {submittedQuery === ''
                    ? 'No courses are available yet.'
                    : 'Try a course code such as CSCI, a course name, or a department.'}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {current.courses.map((course) => (
                    <li key={course.id}>
                      <CourseCard
                        course={course}
                        isSelected={selectedIds.has(course.id)}
                        onAdd={addCourse}
                        onRemove={removeCourse}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <SelectedCoursesPanel courses={selectedCourses} onRemove={removeCourse} onClear={clearSelection} />
      </div>
    </main>
  )
}

function resultSummary(count: number, query: string): string {
  const courses = count === 1 ? 'course' : 'courses'
  return query === '' ? `All ${count} ${courses}` : `${count} ${courses} matching “${query}”`
}
