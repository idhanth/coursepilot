import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../auth/AuthContext.ts'
import { ApiError } from '../services/api.ts'
import { saveSchedule } from '../services/savedSchedules.ts'
import { generateSchedules } from '../services/schedules.ts'
import { withAuth } from '../test/auth.ts'
import type { Course } from '../types/course.ts'
import {
  EMPTY_PREFERENCES,
  type GenerateSchedulesResponse,
  type GeneratedSchedule,
  type PreferenceForm,
} from '../types/schedule.ts'
import ResultsPage from './ResultsPage.tsx'

// Replace the real API call, so each test decides what the "backend" returns.
vi.mock('../services/schedules.ts', () => ({ generateSchedules: vi.fn() }))
vi.mock('../services/savedSchedules.ts', () => ({
  saveSchedule: vi.fn(),
  listSavedSchedules: vi.fn(),
  getSavedSchedule: vi.fn(),
  deleteSavedSchedule: vi.fn(),
}))
const mockGenerateSchedules = vi.mocked(generateSchedules)
const mockSaveSchedule = vi.mocked(saveSchedule)

const COURSES: Course[] = [
  { id: 2, course_code: 'CSCI 1302', course_name: 'Software Development', department: 'Computer Science', description: null, credit_hours: 4 },
  { id: 5, course_code: 'MATH 2250', course_name: 'Calculus I', department: 'Mathematics', description: null, credit_hours: 4 },
]

/** A schedule whose CSCI 1302 section number is `csciSection`, so tests can tell schedules apart. */
function schedule(csciSection: string): GeneratedSchedule {
  return {
    total_credits: 8,
    sections: [
      {
        id: Number(csciSection),
        course_id: 2,
        section_number: csciSection,
        instructor: 'Dr. Smith',
        location: 'Boyd 328',
        meetings: [
          { day_of_week: 0, start_time: '10:20:00', end_time: '11:10:00' },
          { day_of_week: 2, start_time: '10:20:00', end_time: '11:10:00' },
          { day_of_week: 4, start_time: '10:20:00', end_time: '11:10:00' },
        ],
        course: { id: 2, course_code: 'CSCI 1302', course_name: 'Software Development', credit_hours: 4 },
      },
      {
        id: 100,
        course_id: 5,
        section_number: '003',
        instructor: 'Dr. Chen',
        location: 'Boyd 322',
        meetings: [
          { day_of_week: 1, start_time: '09:35:00', end_time: '10:50:00' },
          { day_of_week: 3, start_time: '09:35:00', end_time: '10:50:00' },
        ],
        course: { id: 5, course_code: 'MATH 2250', course_name: 'Calculus I', credit_hours: 4 },
      },
    ],
  }
}

function backendResponse(counts: { total: number; conflictFree: number }, schedules: GeneratedSchedule[]): GenerateSchedulesResponse {
  return {
    total_combinations: counts.total,
    conflict_free_count: counts.conflictFree,
    count: schedules.length,
    schedules,
  }
}

function renderResults(
  selectedCourses: Course[] = COURSES,
  preferences: PreferenceForm = EMPTY_PREFERENCES,
  auth: Partial<AuthContextValue> = {},
) {
  render(
    withAuth(
      <MemoryRouter>
        <ResultsPage selectedCourses={selectedCourses} preferences={preferences} />
      </MemoryRouter>,
      auth,
    ),
  )
}

function LoginMarker() {
  const location = useLocation()
  return <p>Login page, returning to {(location.state as { from?: string } | null)?.from}</p>
}

function counts() {
  return screen.getAllByRole('definition').map((element) => element.textContent)
}

beforeEach(() => {
  mockGenerateSchedules.mockReset()
  mockSaveSchedule.mockReset()
})

describe('Saving the displayed schedule', () => {
  it('sends the name, semester and the section ids of the schedule on screen', async () => {
    mockGenerateSchedules.mockResolvedValue(
      backendResponse({ total: 81, conflictFree: 63 }, [schedule('001'), schedule('002'), schedule('003')]),
    )
    mockSaveSchedule.mockResolvedValue({
      id: 42,
      name: 'Fall 2027 - Late Start',
      semester: 'Fall 2027',
      created_at: '2026-09-15T16:00:00Z',
      course_codes: ['CSCI 1302', 'MATH 2250'],
      total_credits: 8,
      sections: schedule('002').sections,
    })
    renderResults()
    await screen.findByText('Schedule 1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Next' })) // now showing schedule 2

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Fall 2027 - Late Start ' } })
    fireEvent.change(screen.getByLabelText('Semester'), { target: { value: 'Fall 2027' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save Schedule' })))

    // Schedule 2's sections are CSCI 1302-002 (id 2) and MATH 2250-003 (id 100).
    expect(mockSaveSchedule).toHaveBeenCalledWith({ name: 'Fall 2027 - Late Start', semester: 'Fall 2027', section_ids: [2, 100] })
    expect(mockGenerateSchedules).toHaveBeenCalledTimes(1) // saving doesn't regenerate
    expect(screen.getByText('Saved “Fall 2027 - Late Start”.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Open saved schedule' }).getAttribute('href')).toBe('/saved/42')
  })

  it('shows why the backend refused to save and lets the user try again', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 9, conflictFree: 7 }, [schedule('001')]))
    mockSaveSchedule.mockRejectedValue(new ApiError(422, "These sections have a time conflict, so they can't be saved together."))
    renderResults()
    await screen.findByText('Schedule 1 of 1')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Fall 2027 - Option 1' } })
    fireEvent.change(screen.getByLabelText('Semester'), { target: { value: 'Fall 2027' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save Schedule' })))

    expect(screen.getByRole('alert').textContent).toBe("These sections have a time conflict, so they can't be saved together.")
    expect((screen.getByRole('button', { name: 'Save Schedule' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Fall 2027 - Option 1')
  })

  it('needs a name and a semester before saving', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 9, conflictFree: 7 }, [schedule('001')]))
    renderResults()
    await screen.findByText('Schedule 1 of 1')

    fireEvent.click(screen.getByRole('button', { name: 'Save Schedule' }))

    expect(screen.getByText('Enter a name and a semester.')).toBeDefined()
    expect(mockSaveSchedule).not.toHaveBeenCalled()
  })

  it('asks a logged-out user to log in instead of showing the form', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 9, conflictFree: 7 }, [schedule('001')]))
    renderResults(COURSES, EMPTY_PREFERENCES, { user: null })
    await screen.findByText('Schedule 1 of 1')

    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login')
    expect(screen.queryByRole('button', { name: 'Save Schedule' })).toBeNull()
  })
})

describe('ResultsPage', () => {
  it('asks the user to pick courses instead of calling the backend when none are selected', () => {
    renderResults([])

    expect(screen.getByRole('heading', { name: 'No courses selected' })).toBeDefined()
    // Explains why results can vanish: they are only kept until a refresh.
    expect(screen.getByText(/kept only until you refresh or leave the page/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'View saved schedules' }).getAttribute('href')).toBe('/dashboard')
    expect(mockGenerateSchedules).not.toHaveBeenCalled()
  })

  it('sends the selected courses and filled-in preferences, and shows loading until the response arrives', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 9, conflictFree: 7 }, [schedule('001')]))

    renderResults(COURSES, { ...EMPTY_PREFERENCES, earliestStart: '09:00', preferredDayOff: 'Friday' })

    expect(screen.getByRole('status').textContent).toBe('Generating schedules…')
    expect(mockGenerateSchedules).toHaveBeenCalledWith({
      course_ids: [2, 5],
      preferences: { earliest_start: '09:00', preferred_day_off: 'Friday' },
    })
    expect(await screen.findByText('Schedule 1 of 1')).toBeDefined()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Preferences: No classes before 9:00 AM · Friday off')).toBeDefined()
  })

  it('shows the three counts and the first schedule', async () => {
    mockGenerateSchedules.mockResolvedValue(
      backendResponse({ total: 81, conflictFree: 63 }, [schedule('001'), schedule('002'), schedule('003')]),
    )

    renderResults()

    expect(await screen.findByText('Schedule 1 of 3')).toBeDefined()
    expect(counts()).toEqual(['81', '63', '3'])
    expect(screen.getByText('CSCI 1302-001')).toBeDefined()
    expect(screen.getByText('MWF 10:20 AM–11:10 AM')).toBeDefined()
    expect(screen.getByText('8 credits')).toBeDefined()
    // 3 CSCI meetings + 2 MATH meetings on the weekly calendar.
    expect(screen.getAllByTestId('calendar-block')).toHaveLength(5)
  })

  it('moves between schedules with Previous and Next, rendering only one at a time', async () => {
    mockGenerateSchedules.mockResolvedValue(
      backendResponse({ total: 81, conflictFree: 63 }, [schedule('001'), schedule('002'), schedule('003')]),
    )
    renderResults()
    await screen.findByText('Schedule 1 of 3')
    const previous = screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement
    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement

    expect(previous.disabled).toBe(true)

    fireEvent.click(next)
    expect(screen.getByText('Schedule 2 of 3')).toBeDefined()
    expect(screen.getByText('CSCI 1302-002')).toBeDefined()
    expect(screen.queryByText('CSCI 1302-001')).toBeNull()

    fireEvent.click(next)
    expect(screen.getByText('Schedule 3 of 3')).toBeDefined()
    expect(next.disabled).toBe(true)

    fireEvent.click(previous)
    expect(screen.getByText('Schedule 2 of 3')).toBeDefined()
    expect(screen.getAllByTestId('calendar-block')).toHaveLength(5)
  })

  it('keeps the shown schedule in the address, so logging in to save returns to the same schedule', async () => {
    mockGenerateSchedules.mockResolvedValue(
      backendResponse({ total: 81, conflictFree: 63 }, [schedule('001'), schedule('002'), schedule('003')]),
    )
    render(
      withAuth(
        <MemoryRouter initialEntries={['/results?schedule=2']}>
          <Routes>
            <Route path="/results" element={<ResultsPage selectedCourses={COURSES} preferences={EMPTY_PREFERENCES} />} />
            <Route path="/login" element={<LoginMarker />} />
          </Routes>
        </MemoryRouter>,
        { user: null },
      ),
    )

    // Opening /results?schedule=2 (what login returns to) shows schedule 2, not schedule 1.
    expect(await screen.findByText('Schedule 2 of 3')).toBeDefined()
    expect(screen.getByText('CSCI 1302-002')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Log in to save schedule 3 of 3 to your dashboard/)).toBeDefined()
    fireEvent.click(screen.getByRole('link', { name: 'Log in' }))

    expect(screen.getByText('Login page, returning to /results?schedule=3')).toBeDefined()
  })

  it('disables both buttons when there is exactly one schedule', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 9, conflictFree: 1 }, [schedule('001')]))
    renderResults()

    await screen.findByText('Schedule 1 of 1')

    const navigation = screen.getByRole('navigation', { name: 'Schedule navigation' })
    for (const button of within(navigation).getAllByRole('button') as HTMLButtonElement[]) {
      expect(button.disabled).toBe(true)
    }
  })

  it('explains that the courses cannot fit together when no combination is conflict-free', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 4, conflictFree: 0 }, []))
    renderResults()

    expect(await screen.findByRole('heading', { name: "These courses can't fit together" })).toBeDefined()
    expect(screen.getByText(/Every one of the 4 section combinations has a time conflict/)).toBeDefined()
    expect(counts()).toEqual(['4', '0', '0'])
    expect(screen.queryByRole('navigation', { name: 'Schedule navigation' })).toBeNull()
  })

  it('explains that preferences are too strict when conflict-free schedules were all filtered out', async () => {
    mockGenerateSchedules.mockResolvedValue(backendResponse({ total: 81, conflictFree: 63 }, []))
    renderResults(COURSES, { ...EMPTY_PREFERENCES, preferredDayOff: 'Friday' })

    expect(await screen.findByRole('heading', { name: 'No schedules match your preferences' })).toBeDefined()
    expect(screen.getByText(/63 conflict-free schedules exist, but your preferences rule out all of them/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Edit preferences' }).getAttribute('href')).toBe('/planner')
  })

  it('shows the error and tries again when asked', async () => {
    mockGenerateSchedules
      .mockRejectedValueOnce(new ApiError(0, 'The CoursePilot server is unavailable.'))
      .mockResolvedValueOnce(backendResponse({ total: 9, conflictFree: 7 }, [schedule('001')]))
    renderResults()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('The CoursePilot server is unavailable.')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Schedule 1 of 1')).toBeDefined()
    expect(mockGenerateSchedules).toHaveBeenCalledTimes(2)
  })
})
