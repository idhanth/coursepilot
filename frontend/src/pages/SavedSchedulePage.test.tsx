import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.ts'
import { deleteSavedSchedule, getSavedSchedule } from '../services/savedSchedules.ts'
import { withAuth } from '../test/auth.ts'
import type { SavedScheduleDetail } from '../types/savedSchedule.ts'
import SavedSchedulePage from './SavedSchedulePage.tsx'

vi.mock('../services/savedSchedules.ts', () => ({
  listSavedSchedules: vi.fn(),
  deleteSavedSchedule: vi.fn(),
  getSavedSchedule: vi.fn(),
  saveSchedule: vi.fn(),
}))
const mockGet = vi.mocked(getSavedSchedule)
const mockDelete = vi.mocked(deleteSavedSchedule)

const SAVED: SavedScheduleDetail = {
  id: 7,
  name: 'Fall 2027 - Late Start',
  semester: 'Fall 2027',
  created_at: '2026-09-15T16:00:00Z',
  course_codes: ['CSCI 1302', 'MATH 2250'],
  total_credits: 8,
  sections: [
    {
      id: 2,
      course_id: 2,
      section_number: '001',
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
      id: 9,
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

function renderSaved(id: string) {
  render(
    withAuth(
      <MemoryRouter initialEntries={[`/saved/${id}`]}>
        <Routes>
          <Route path="/saved/:id" element={<SavedSchedulePage />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}

beforeEach(() => {
  mockGet.mockReset()
  mockDelete.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SavedSchedulePage', () => {
  it('opens a saved schedule with the same section list and weekly calendar as the results page', async () => {
    mockGet.mockResolvedValue(SAVED)
    renderSaved('7')

    expect(await screen.findByRole('heading', { name: 'Fall 2027 - Late Start' })).toBeDefined()
    expect(mockGet).toHaveBeenCalledWith(7)
    expect(screen.getByText('Fall 2027 · 8 credits · Saved Sep 15, 2026')).toBeDefined()
    expect(screen.getByText('CSCI 1302-001')).toBeDefined()
    expect(screen.getByText('TR 9:35 AM–10:50 AM')).toBeDefined()
    expect(screen.getAllByTestId('calendar-block')).toHaveLength(5)
  })

  it('shows "not found" for a schedule the backend won\'t return', async () => {
    mockGet.mockRejectedValue(new ApiError(404, 'Saved schedule not found.'))
    renderSaved('12')

    expect(await screen.findByRole('heading', { name: 'Saved schedule not found' })).toBeDefined()
  })

  it('shows a server error as an error, not as "not found"', async () => {
    mockGet.mockRejectedValueOnce(new ApiError(0, 'The CoursePilot server is unavailable.')).mockResolvedValueOnce(SAVED)
    renderSaved('7')

    expect((await screen.findByRole('alert')).textContent).toBe('The CoursePilot server is unavailable.')
    expect(screen.queryByRole('heading', { name: 'Saved schedule not found' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Fall 2027 - Late Start' })).toBeDefined()
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('shows "not found" for an id that is not a number without calling the backend', () => {
    renderSaved('abc')

    expect(screen.getByRole('heading', { name: 'Saved schedule not found' })).toBeDefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('deletes the schedule and returns to the dashboard', async () => {
    mockGet.mockResolvedValue(SAVED)
    mockDelete.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderSaved('7')
    await screen.findByRole('heading', { name: 'Fall 2027 - Late Start' })

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Delete' })))

    expect(mockDelete).toHaveBeenCalledWith(7)
    expect(screen.getByText('Dashboard page')).toBeDefined()
  })
})
