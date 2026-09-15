import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import AuthProvider from './auth/AuthProvider.tsx'
import { listCourses } from './services/courses.ts'
import type { Course } from './types/course.ts'

vi.mock('./services/courses.ts', () => ({ listCourses: vi.fn(), searchCourses: vi.fn(), getCourseSections: vi.fn() }))
vi.mock('./services/auth.ts', () => ({ loginUser: vi.fn(), registerUser: vi.fn(), getCurrentUser: vi.fn() }))

const CSCI: Course = { id: 2, course_code: 'CSCI 1302', course_name: 'Software Development', department: 'Computer Science', description: null, credit_hours: 4 }
const ENGL: Course = { id: 8, course_code: 'ENGL 1102', course_name: 'English Composition II', department: 'English', description: null, credit_hours: 3 }

describe('App', () => {
  it('shows "Page not found" for an unknown address instead of a blank page', () => {
    render(
      <MemoryRouter initialEntries={['/no-such-page']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Search courses' }).getAttribute('href')).toBe('/courses')
  })

  it('carries the courses selected on the search page into the schedule builder and back', async () => {
    vi.mocked(listCourses).mockResolvedValue([CSCI, ENGL])
    render(
      <MemoryRouter initialEntries={['/courses']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )
    await screen.findByText('All 2 courses')
    const card = (code: string) => screen.getByRole('heading', { name: code }).closest('article') as HTMLElement

    fireEvent.click(within(card('CSCI 1302')).getByRole('button', { name: 'Add' }))
    fireEvent.click(within(card('ENGL 1102')).getByRole('button', { name: 'Add' }))
    expect(within(screen.getByRole('banner')).getByRole('link', { name: /Schedule Builder/ }).textContent).toBe('Schedule Builder2')

    fireEvent.click(screen.getByRole('link', { name: 'Build Schedule' }))

    expect(screen.getByRole('heading', { name: 'Schedule Builder' })).toBeDefined()
    expect(screen.getByText('2 courses · 7 credits')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Remove ENGL 1102' }))
    fireEvent.click(screen.getByRole('link', { name: 'Add more courses' }))

    await screen.findByText('All 2 courses')
    expect(within(card('CSCI 1302')).getByRole('button', { name: 'Remove' })).toBeDefined()
    expect(within(card('ENGL 1102')).getByRole('button', { name: 'Add' })).toBeDefined()
  })
})
