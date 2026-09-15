import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.ts'
import { getCourseSections, listCourses, searchCourses } from '../services/courses.ts'
import type { Course, Section } from '../types/course.ts'
import CourseSearchPage from './CourseSearchPage.tsx'

vi.mock('../services/courses.ts', () => ({ listCourses: vi.fn(), searchCourses: vi.fn(), getCourseSections: vi.fn() }))
const mockList = vi.mocked(listCourses)
const mockSearch = vi.mocked(searchCourses)
const mockSections = vi.mocked(getCourseSections)

const CSCI: Course = { id: 2, course_code: 'CSCI 1302', course_name: 'Software Development', department: 'Computer Science', description: 'Java.', credit_hours: 4 }
const MATH: Course = { id: 5, course_code: 'MATH 2250', course_name: 'Calculus I', department: 'Mathematics', description: null, credit_hours: 4 }

const CSCI_SECTION: Section = {
  id: 11,
  course_id: 2,
  section_number: '001',
  instructor: 'Dr. Smith',
  location: 'Boyd 328',
  meetings: [
    { day_of_week: 0, start_time: '10:20:00', end_time: '11:10:00' },
    { day_of_week: 2, start_time: '10:20:00', end_time: '11:10:00' },
    { day_of_week: 4, start_time: '10:20:00', end_time: '11:10:00' },
  ],
}

function renderSearch(selectedCourses: Course[] = []) {
  const props = { onAddCourse: vi.fn(), onRemoveCourse: vi.fn(), onClearCourses: vi.fn() }
  render(
    <MemoryRouter>
      <CourseSearchPage selectedCourses={selectedCourses} {...props} />
    </MemoryRouter>,
  )
  return props
}

function courseCard(code: string) {
  return screen.getByRole('heading', { name: code }).closest('article') as HTMLElement
}

beforeEach(() => {
  mockList.mockReset()
  mockSearch.mockReset()
  mockSections.mockReset()
})

describe('CourseSearchPage', () => {
  it('lists every course on open, searches with the trimmed query, and can show all courses again', async () => {
    mockList.mockResolvedValue([CSCI, MATH])
    mockSearch.mockResolvedValue([CSCI])
    renderSearch()
    expect(await screen.findByText('All 2 courses')).toBeDefined()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search courses' }), { target: { value: '  csci ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('1 course matching “csci”')).toBeDefined()
    expect(mockSearch).toHaveBeenCalledWith('csci')
    expect(screen.queryByRole('heading', { name: 'MATH 2250' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Show all courses' }))

    expect(await screen.findByText('All 2 courses')).toBeDefined()
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
  })

  it('shows the error when courses cannot be loaded', async () => {
    mockList.mockRejectedValue(new ApiError(0, 'The CoursePilot server is unavailable.'))
    renderSearch()

    expect((await screen.findByRole('alert')).textContent).toBe('The CoursePilot server is unavailable.')
  })

  it('reports Add and Remove to the parent, which owns the selection', async () => {
    mockList.mockResolvedValue([CSCI, MATH])
    const { onAddCourse, onRemoveCourse } = renderSearch([CSCI])
    await screen.findByText('All 2 courses')

    // CSCI 1302 is already selected, so its card offers Remove; MATH 2250 offers Add.
    fireEvent.click(within(courseCard('MATH 2250')).getByRole('button', { name: 'Add' }))
    fireEvent.click(within(courseCard('CSCI 1302')).getByRole('button', { name: 'Remove' }))

    expect(onAddCourse).toHaveBeenCalledWith(MATH)
    expect(onRemoveCourse).toHaveBeenCalledWith(2)
    expect(within(screen.getByRole('complementary')).getByRole('link', { name: 'Build Schedule' }).getAttribute('href')).toBe(
      '/planner',
    )
  })

  it("loads a course's sections the first time they are opened and reuses them afterwards", async () => {
    mockList.mockResolvedValue([CSCI, MATH])
    mockSections.mockImplementation(async (courseId) => (courseId === CSCI.id ? [CSCI_SECTION] : []))
    renderSearch()
    await screen.findByText('All 2 courses')
    const csci = courseCard('CSCI 1302')

    fireEvent.click(within(csci).getByRole('button', { name: 'View Sections' }))
    expect(await within(csci).findByText('Section 001')).toBeDefined()
    expect(within(csci).getByText('MWF 10:20 AM–11:10 AM')).toBeDefined()

    fireEvent.click(within(csci).getByRole('button', { name: 'Hide Sections' }))
    fireEvent.click(within(csci).getByRole('button', { name: 'View Sections' }))
    expect(within(csci).getByText('Section 001')).toBeDefined()
    expect(mockSections).toHaveBeenCalledTimes(1)

    const math = courseCard('MATH 2250')
    fireEvent.click(within(math).getByRole('button', { name: 'View Sections' }))
    expect(await within(math).findByText('No sections are offered for this course.')).toBeDefined()
  })
})
