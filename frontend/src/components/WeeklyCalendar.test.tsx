import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GeneratedSchedule, ScheduleSection } from '../types/schedule.ts'
import WeeklyCalendar from './WeeklyCalendar.tsx'

function section(id: number, code: string, meetings: [number, string, string][]): ScheduleSection {
  return {
    id,
    course_id: id,
    section_number: '001',
    instructor: 'Staff',
    location: 'Boyd 328',
    meetings: meetings.map(([day_of_week, start_time, end_time]) => ({ day_of_week, start_time, end_time })),
    course: { id, course_code: code, course_name: code, credit_hours: 4 },
  }
}

const MWF_LECTURE = section(1, 'CSCI 1302', [
  [0, '10:20:00', '11:10:00'],
  [2, '10:20:00', '11:10:00'],
  [4, '10:20:00', '11:10:00'],
])
const TUESDAY_AND_SATURDAY = section(2, 'PHYS 1211', [
  [1, '13:00:00', '14:15:00'],
  [5, '09:00:00', '11:50:00'],
])

/** The day names in header order, and for each header the day column below it. */
function dayColumns(container: HTMLElement) {
  const grid = container.querySelector('.grid') as HTMLElement
  const cells = [...grid.children] as HTMLElement[]
  const dayCount = (cells.length - 2) / 2 // corner + headers + hour labels + columns
  return { headers: cells.slice(1, 1 + dayCount).map((cell) => cell.textContent), columns: cells.slice(2 + dayCount) }
}

describe('WeeklyCalendar', () => {
  it('draws Monday to Friday and puts each meeting in its own day column', () => {
    const { container } = render(<WeeklyCalendar schedule={{ total_credits: 4, sections: [MWF_LECTURE] }} />)
    const { headers, columns } = dayColumns(container)

    expect(headers).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    expect(columns.map((column) => column.querySelectorAll('[data-testid="calendar-block"]').length)).toEqual([1, 0, 1, 0, 1])
  })

  it('adds a Saturday column only when a class meets then, and sizes each block by its times', () => {
    const schedule: GeneratedSchedule = { total_credits: 8, sections: [MWF_LECTURE, TUESDAY_AND_SATURDAY] }
    const { container } = render(<WeeklyCalendar schedule={schedule} />)
    const { headers, columns } = dayColumns(container)

    expect(headers).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    const saturdayBlock = columns[5].querySelector('[data-testid="calendar-block"]') as HTMLElement
    expect(saturdayBlock.textContent).toContain('PHYS 1211')
    expect(saturdayBlock.textContent).toContain('9:00–11:50 AM')

    // The calendar shows 8 AM to 5 PM (540 minutes). 9:00 is 60 minutes in; the lab lasts 170 minutes.
    expect(parseFloat(saturdayBlock.style.top)).toBeCloseTo((60 / 540) * 100)
    expect(parseFloat(saturdayBlock.style.height)).toBeCloseTo((170 / 540) * 100)
    expect(screen.getAllByTestId('calendar-block')).toHaveLength(5)
  })
})
