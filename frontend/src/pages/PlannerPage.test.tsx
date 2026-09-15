import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Course } from '../types/course.ts'
import { EMPTY_PREFERENCES, type PreferenceForm } from '../types/schedule.ts'
import PlannerPage from './PlannerPage.tsx'

const COURSES: Course[] = [
  { id: 2, course_code: 'CSCI 1302', course_name: 'Software Development', department: 'Computer Science', description: null, credit_hours: 4 },
  { id: 5, course_code: 'ENGL 1102', course_name: 'English Composition II', department: 'English', description: null, credit_hours: 3 },
]

/**
 * Holds the preferences in state, the way App does, and prints them on the page so tests can read them.
 * Navigating to /results shows a marker instead of the real results page.
 */
function Harness({ selectedCourses, onRemoveCourse }: { selectedCourses: Course[]; onRemoveCourse: (id: number) => void }) {
  const [preferences, setPreferences] = useState<PreferenceForm>(EMPTY_PREFERENCES)
  return (
    <MemoryRouter initialEntries={['/planner']}>
      <Routes>
        <Route
          path="/planner"
          element={
            <PlannerPage
              selectedCourses={selectedCourses}
              onRemoveCourse={onRemoveCourse}
              preferences={preferences}
              onPreferencesChange={setPreferences}
            />
          }
        />
        <Route path="/results" element={<p>Results page</p>} />
      </Routes>
      <output data-testid="stored-preferences">{JSON.stringify(preferences)}</output>
    </MemoryRouter>
  )
}

function renderPlanner(selectedCourses: Course[] = COURSES) {
  const onRemoveCourse = vi.fn()
  render(<Harness selectedCourses={selectedCourses} onRemoveCourse={onRemoveCourse} />)
  return { onRemoveCourse }
}

function storedPreferences(): PreferenceForm {
  return JSON.parse(screen.getByTestId('stored-preferences').textContent ?? '')
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('PlannerPage', () => {
  it('asks the user to pick courses when none are selected', () => {
    renderPlanner([])

    expect(screen.getByRole('heading', { name: 'No courses selected' })).toBeDefined()
    expect(screen.getByText(/a refresh starts over/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Search courses' }).getAttribute('href')).toBe('/courses')
  })

  it('lists the selected courses with their total credits and lets one be removed', () => {
    const { onRemoveCourse } = renderPlanner()

    expect(screen.getByText('2 courses · 7 credits')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Remove ENGL 1102' }))
    expect(onRemoveCourse).toHaveBeenCalledWith(5)
  })

  it('stores what is typed into the four preference fields', () => {
    renderPlanner()

    change('Earliest class start', '09:00')
    change('Latest class end', '15:00')
    change('Preferred day off', 'Friday')
    change('Maximum classes per day', '3')

    expect(storedPreferences()).toEqual({
      earliestStart: '09:00',
      latestEnd: '15:00',
      preferredDayOff: 'Friday',
      maxClassesPerDay: '3',
    })
  })

  it('goes to the results page when the form is valid', () => {
    renderPlanner()

    change('Earliest class start', '09:00')
    fireEvent.click(screen.getByRole('button', { name: 'Generate Schedules' }))

    expect(screen.getByText('Results page')).toBeDefined()
  })

  it('stays on the page and explains the problem when the preferences are invalid', () => {
    renderPlanner()

    change('Earliest class start', '15:00')
    change('Latest class end', '09:00')
    fireEvent.click(screen.getByRole('button', { name: 'Generate Schedules' }))

    expect(screen.getByRole('alert').textContent).toBe('Latest end must be later than earliest start.')
    expect(screen.queryByText('Results page')).toBeNull()
  })

  it('clears every preference', () => {
    renderPlanner()
    change('Maximum classes per day', '2')

    fireEvent.click(screen.getByRole('button', { name: 'Clear preferences' }))

    expect(storedPreferences()).toEqual(EMPTY_PREFERENCES)
  })
})
