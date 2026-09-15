import { useEffect, useState, type FormEvent } from 'react'
import CourseCard from '../components/CourseCard.tsx'
import EmptyState from '../components/EmptyState.tsx'
import ErrorMessage from '../components/ErrorMessage.tsx'
import LoadingMessage from '../components/LoadingMessage.tsx'
import Page from '../components/Page.tsx'
import PageHeader from '../components/PageHeader.tsx'
import SelectedCoursesPanel from '../components/SelectedCoursesPanel.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { listCourses, searchCourses } from '../services/courses.ts'
import { buttonClass, inputClass } from '../styles.ts'
import type { Course } from '../types/course.ts'

// A finished request, remembering which attempt it belongs to.
type SearchResult = { attempt: number; kind: 'ready'; courses: Course[] } | { attempt: number; kind: 'error'; message: string }

type CourseSearchPageProps = {
  // The selection is owned by App, so it is still there on the schedule builder and results pages.
  selectedCourses: Course[]
  onAddCourse: (course: Course) => void
  onRemoveCourse: (courseId: number) => void
  onClearCourses: () => void
}

export default function CourseSearchPage({
  selectedCourses,
  onAddCourse,
  onRemoveCourse,
  onClearCourses,
}: CourseSearchPageProps) {
  useDocumentTitle('Search Courses')
  const [input, setInput] = useState('') // what is typed in the search box
  const [submittedQuery, setSubmittedQuery] = useState('') // the last search submitted; '' means all courses
  const [attempt, setAttempt] = useState(0) // goes up on every search and "Try again", so each one reloads
  const [result, setResult] = useState<SearchResult | null>(null)

  useEffect(() => {
    // If a newer request starts before this one finishes, this outdated response is ignored.
    let ignore = false

    const request = submittedQuery === '' ? listCourses() : searchCourses(submittedQuery)
    request
      .then((courses) => {
        if (!ignore) setResult({ attempt, kind: 'ready', courses })
      })
      .catch((error: Error) => {
        if (!ignore) setResult({ attempt, kind: 'error', message: error.message })
      })

    return () => {
      ignore = true
    }
  }, [submittedQuery, attempt])

  // Until the result for the current attempt arrives, the page shows "Loading".
  const current = result !== null && result.attempt === attempt ? result : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser from reloading the page
    setSubmittedQuery(input.trim())
    setAttempt((previous) => previous + 1)
  }

  function showAllCourses() {
    setInput('')
    setSubmittedQuery('')
    setAttempt((previous) => previous + 1)
  }

  const selectedIds = new Set(selectedCourses.map((course) => course.id))

  return (
    <Page>
      <PageHeader
        title="Search Courses"
        description="Search by course code, course name, or department, then add the courses you want to take."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
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
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button type="submit" className={buttonClass()}>
              Search
            </button>
          </form>

          {current === null && <LoadingMessage>Loading courses…</LoadingMessage>}

          {current?.kind === 'error' && (
            <ErrorMessage message={current.message} onRetry={() => setAttempt((previous) => previous + 1)} />
          )}

          {current?.kind === 'ready' && (
            <>
              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-slate-600">{resultSummary(current.courses.length, submittedQuery)}</p>
                {submittedQuery !== '' && (
                  <button
                    type="button"
                    onClick={showAllCourses}
                    className="rounded text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    Show all courses
                  </button>
                )}
              </div>

              {current.courses.length === 0 ? (
                submittedQuery === '' ? (
                  <EmptyState title="No courses yet" message="The course catalog is empty. Load the sample courses to get started." />
                ) : (
                  <EmptyState
                    title="No matching courses"
                    message="Try a course code such as CSCI, a course name, or a department."
                  />
                )
              ) : (
                <ul className="mt-3 space-y-3">
                  {current.courses.map((course) => (
                    <li key={course.id}>
                      <CourseCard
                        course={course}
                        isSelected={selectedIds.has(course.id)}
                        onAdd={onAddCourse}
                        onRemove={onRemoveCourse}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <SelectedCoursesPanel courses={selectedCourses} onRemove={onRemoveCourse} onClear={onClearCourses} />
      </div>
    </Page>
  )
}

function resultSummary(count: number, query: string): string {
  const courses = count === 1 ? 'course' : 'courses'
  return query === '' ? `All ${count} ${courses}` : `${count} ${courses} matching “${query}”`
}
