import { useState } from 'react'
import { getCourseSections } from '../services/courses.ts'
import type { Course, Section } from '../types/course.ts'
import SectionCard from './SectionCard.tsx'

type SectionsState =
  | { kind: 'not-loaded' }
  | { kind: 'loading' }
  | { kind: 'ready'; sections: Section[] }
  | { kind: 'error'; message: string }

type CourseCardProps = {
  course: Course
  isSelected: boolean
  onAdd: (course: Course) => void
  onRemove: (courseId: number) => void
}

export default function CourseCard({ course, isSelected, onAdd, onRemove }: CourseCardProps) {
  const [showSections, setShowSections] = useState(false)
  const [sections, setSections] = useState<SectionsState>({ kind: 'not-loaded' })
  const sectionsId = `course-${course.id}-sections`

  function toggleSections() {
    const opening = !showSections
    setShowSections(opening)

    // Sections are fetched the first time they are opened (or again after an error), then kept.
    if (opening && (sections.kind === 'not-loaded' || sections.kind === 'error')) {
      setSections({ kind: 'loading' })
      getCourseSections(course.id)
        .then((loaded) => setSections({ kind: 'ready', sections: loaded }))
        .catch((error: Error) => setSections({ kind: 'error', message: error.message }))
    }
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{course.course_code}</h2>
          <p className="text-slate-800">{course.course_name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {course.department} · {course.credit_hours} {course.credit_hours === 1 ? 'credit' : 'credits'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleSections}
            aria-expanded={showSections}
            aria-controls={sectionsId}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showSections ? 'Hide Sections' : 'View Sections'}
          </button>
          {isSelected ? (
            <button
              type="button"
              onClick={() => onRemove(course.id)}
              className="rounded-md border border-blue-700 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(course)}
              className="rounded-md border border-blue-700 bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {course.description && <p className="mt-3 text-sm text-slate-600">{course.description}</p>}

      {showSections && (
        <div id={sectionsId} className="mt-4 border-t border-slate-100 pt-4">
          {sections.kind === 'loading' && <p className="text-sm text-slate-500">Loading sections…</p>}
          {sections.kind === 'error' && (
            <p role="alert" className="text-sm text-red-700">
              {sections.message}
            </p>
          )}
          {sections.kind === 'ready' && sections.sections.length === 0 && (
            <p className="text-sm text-slate-500">No sections are offered for this course.</p>
          )}
          {sections.kind === 'ready' && sections.sections.length > 0 && (
            <ul className="space-y-2">
              {sections.sections.map((section) => (
                <li key={section.id}>
                  <SectionCard section={section} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}
