import { describe, expect, it } from 'vitest'
import type { GeneratedSchedule, ScheduleSection } from '../types/schedule.ts'
import {
  blockPosition,
  calendarBlocks,
  calendarDays,
  calendarHours,
  formatTimeRange,
  hourLabel,
  minutesSinceMidnight,
} from './calendar.ts'

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

// A MWF lecture and a TR lecture with a Wednesday lab.
const SCHEDULE: GeneratedSchedule = {
  total_credits: 8,
  sections: [
    section(1, 'CSCI 1302', [
      [0, '10:20:00', '11:10:00'],
      [2, '10:20:00', '11:10:00'],
      [4, '10:20:00', '11:10:00'],
    ]),
    section(2, 'PHYS 1211', [
      [1, '11:10:00', '12:25:00'],
      [2, '14:55:00', '16:45:00'],
      [3, '11:10:00', '12:25:00'],
    ]),
  ],
}

describe('time helpers', () => {
  it('converts a time to minutes after midnight', () => {
    expect(minutesSinceMidnight('00:00:00')).toBe(0)
    expect(minutesSinceMidnight('10:20:00')).toBe(620)
    expect(minutesSinceMidnight('16:45:00')).toBe(1005)
  })

  it('formats a time range, writing AM/PM once when both times share it', () => {
    expect(formatTimeRange('10:20:00', '11:10:00')).toBe('10:20–11:10 AM')
    expect(formatTimeRange('12:40:00', '13:30:00')).toBe('12:40–1:30 PM')
    expect(formatTimeRange('11:30:00', '12:20:00')).toBe('11:30 AM–12:20 PM')
  })

  it('labels hours', () => {
    expect([0, 8, 11, 12, 13, 17].map(hourLabel)).toEqual(['12 AM', '8 AM', '11 AM', '12 PM', '1 PM', '5 PM'])
  })
})

describe('calendarBlocks', () => {
  it('creates one block per meeting, so a MWF section appears under three days', () => {
    const blocks = calendarBlocks(SCHEDULE)

    expect(blocks).toHaveLength(6)
    expect(blocks.filter((block) => block.courseCode === 'CSCI 1302').map((block) => block.dayOfWeek)).toEqual([0, 2, 4])
  })

  it('keeps each meeting’s own times and gives each course one color', () => {
    const lab = calendarBlocks(SCHEDULE).find((block) => block.courseCode === 'PHYS 1211' && block.dayOfWeek === 2)

    expect(lab).toMatchObject({ startMinutes: 895, endMinutes: 1005, sectionNumber: '001', colorIndex: 1 })
    expect(new Set(calendarBlocks(SCHEDULE).filter((b) => b.courseCode === 'CSCI 1302').map((b) => b.colorIndex))).toEqual(
      new Set([0]),
    )
  })
})

describe('course colors', () => {
  it('gives each course the same color whatever order its sections arrive in', () => {
    // Results list sections in selection order; saved schedules list them by course code.
    const colors = (schedule: GeneratedSchedule) =>
      Object.fromEntries(calendarBlocks(schedule).map((block) => [block.courseCode, block.colorIndex]))
    const reversed: GeneratedSchedule = { ...SCHEDULE, sections: [...SCHEDULE.sections].reverse() }

    expect(colors(reversed)).toEqual(colors(SCHEDULE))
    expect(colors(SCHEDULE)).toEqual({ 'CSCI 1302': 0, 'PHYS 1211': 1 })
  })
})

describe('calendar layout', () => {
  it('always shows Monday to Friday and adds weekend days only when needed', () => {
    const weekdays = calendarBlocks(SCHEDULE)
    const withSaturday = calendarBlocks({ ...SCHEDULE, sections: [section(3, 'TEST 1000', [[5, '09:00:00', '11:50:00']])] })

    expect(calendarDays(weekdays)).toEqual([0, 1, 2, 3, 4])
    expect(calendarDays(withSaturday)).toEqual([0, 1, 2, 3, 4, 5])
    expect(calendarDays([])).toEqual([0, 1, 2, 3, 4])
  })

  it('shows 8 AM to 5 PM, widened to whole hours for earlier or later classes', () => {
    expect(calendarHours(calendarBlocks(SCHEDULE))).toEqual({ startHour: 8, endHour: 17 })

    const early = calendarBlocks({ ...SCHEDULE, sections: [section(3, 'TEST 1000', [[0, '07:30:00', '08:20:00']])] })
    const late = calendarBlocks({ ...SCHEDULE, sections: [section(3, 'TEST 1000', [[0, '17:10:00', '18:25:00']])] })
    expect(calendarHours(early)).toEqual({ startHour: 7, endHour: 17 })
    expect(calendarHours(late)).toEqual({ startHour: 8, endHour: 19 })
  })

  it('positions a block by its start time and sizes it by its length', () => {
    const [mondayCsci] = calendarBlocks(SCHEDULE) // 10:20–11:10 on an 8 AM–6 PM calendar (600 minutes)

    const { top, height } = blockPosition(mondayCsci, 8, 18)

    expect(top).toBeCloseTo((140 / 600) * 100) // starts 140 minutes after 8:00
    expect(height).toBeCloseTo((50 / 600) * 100) // lasts 50 minutes
  })
})
