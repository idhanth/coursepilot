import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteSavedSchedule, listSavedSchedules } from '../services/savedSchedules.ts'
import { withAuth } from '../test/auth.ts'
import type { SavedScheduleSummary } from '../types/savedSchedule.ts'
import DashboardPage from './DashboardPage.tsx'

vi.mock('../services/savedSchedules.ts', () => ({
  listSavedSchedules: vi.fn(),
  deleteSavedSchedule: vi.fn(),
  getSavedSchedule: vi.fn(),
  saveSchedule: vi.fn(),
}))
const mockList = vi.mocked(listSavedSchedules)
const mockDelete = vi.mocked(deleteSavedSchedule)

const SAVED: SavedScheduleSummary[] = [
  { id: 7, name: 'Fall 2027 - Late Start', semester: 'Fall 2027', created_at: '2026-09-15T16:00:00Z', course_codes: ['CSCI 1302', 'MATH 2250'], total_credits: 8 },
  { id: 4, name: 'Fall 2027 - Friday Off', semester: 'Fall 2027', created_at: '2026-09-14T16:00:00Z', course_codes: ['ENGL 1102'], total_credits: 3 },
]

function renderDashboard(logout = vi.fn()) {
  render(withAuth(<MemoryRouter><DashboardPage /></MemoryRouter>, { logout }))
  return { logout }
}

beforeEach(() => {
  mockList.mockReset()
  mockDelete.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DashboardPage', () => {
  it('greets the user and lists their saved schedules with Open links', async () => {
    mockList.mockResolvedValue(SAVED)
    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Welcome, Test Student' })).toBeDefined()
    expect(await screen.findByText('Fall 2027 - Late Start')).toBeDefined()
    expect(screen.getByText('Fall 2027 · 8 credits · Saved Sep 15, 2026')).toBeDefined()
    expect(screen.getByText('CSCI 1302 · MATH 2250')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Open Fall 2027 - Late Start' }).getAttribute('href')).toBe('/saved/7')
    expect(screen.getByRole('link', { name: 'Build New Schedule' }).getAttribute('href')).toBe('/courses')
  })

  it('shows an empty state when nothing is saved', async () => {
    mockList.mockResolvedValue([])
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'No saved schedules yet' })).toBeDefined()
  })

  it('deletes a schedule after confirmation and removes it from the list', async () => {
    mockList.mockResolvedValue(SAVED)
    mockDelete.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderDashboard()
    await screen.findByText('Fall 2027 - Late Start')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Delete Fall 2027 - Late Start' })))

    expect(mockDelete).toHaveBeenCalledWith(7)
    expect(screen.queryByText('Fall 2027 - Late Start')).toBeNull()
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1)
  })

  it('keeps the schedule when deletion is not confirmed', async () => {
    mockList.mockResolvedValue(SAVED)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderDashboard()
    await screen.findByText('Fall 2027 - Late Start')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Fall 2027 - Late Start' }))

    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Fall 2027 - Late Start')).toBeDefined()
  })

  it('logs out', async () => {
    mockList.mockResolvedValue([])
    const { logout } = renderDashboard()
    await screen.findByRole('heading', { name: 'No saved schedules yet' })

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(logout).toHaveBeenCalledOnce()
  })
})
