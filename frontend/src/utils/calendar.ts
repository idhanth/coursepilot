import type { GeneratedSchedule, ScheduleSection } from '../types/schedule.ts'
import { formatTime } from './format.ts'

/** Sort comparator: sections in course-code order, the same order the backend uses for saved schedules. */
export function byCourseCode(a: ScheduleSection, b: ScheduleSection): number {
  const codeA = a.course.course_code
  const codeB = b.course.course_code
  return codeA < codeB ? -1 : codeA > codeB ? 1 : 0
}

/**
 * Each course's color number: its position when the schedule's sections are sorted by course code.
 * Generated results list courses in the order they were selected and saved schedules in course-code
 * order, so numbering by the sorted order gives a course the same color in both places.
 */
export function courseColorIndexes(schedule: GeneratedSchedule): Map<string, number> {
  const sorted = [...schedule.sections].sort(byCourseCode)
  return new Map(sorted.map((section, index) => [section.course.course_code, index]))
}

/** One class meeting drawn on the weekly calendar. */
export type CalendarBlock = {
  key: string
  dayOfWeek: number // 0 = Monday ... 6 = Sunday
  courseCode: string
  sectionNumber: string
  location: string
  startTime: string // "HH:MM:SS"
  endTime: string
  startMinutes: number // minutes after midnight
  endMinutes: number
  colorIndex: number // see courseColorIndexes: all of a course's meetings share one color
}

/** "10:20:00" -> 620 */
export function minutesSinceMidnight(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

/** One block per meeting record. A MWF section has three meetings, so it becomes three blocks. */
export function calendarBlocks(schedule: GeneratedSchedule): CalendarBlock[] {
  const colorIndexes = courseColorIndexes(schedule)
  return schedule.sections.flatMap((section) =>
    section.meetings.map((meeting) => ({
      key: `${section.id}-${meeting.day_of_week}-${meeting.start_time}`,
      dayOfWeek: meeting.day_of_week,
      courseCode: section.course.course_code,
      sectionNumber: section.section_number,
      location: section.location,
      startTime: meeting.start_time,
      endTime: meeting.end_time,
      startMinutes: minutesSinceMidnight(meeting.start_time),
      endMinutes: minutesSinceMidnight(meeting.end_time),
      colorIndex: colorIndexes.get(section.course.course_code) ?? 0,
    })),
  )
}

/** The day columns to draw: always Monday to Friday, plus Saturday or Sunday only if a class meets then. */
export function calendarDays(blocks: CalendarBlock[]): number[] {
  const days = new Set([0, 1, 2, 3, 4])
  for (const block of blocks) {
    days.add(block.dayOfWeek)
  }
  return [...days].sort((a, b) => a - b)
}

/** The hours down the side: 8 AM to 5 PM, widened to whole hours if a class starts earlier or ends later. */
export function calendarHours(blocks: CalendarBlock[]): { startHour: number; endHour: number } {
  const earliest = Math.min(8 * 60, ...blocks.map((block) => block.startMinutes))
  const latest = Math.max(17 * 60, ...blocks.map((block) => block.endMinutes))
  return { startHour: Math.floor(earliest / 60), endHour: Math.ceil(latest / 60) }
}

/** Where a block sits in its day column, as percentages of the column's height. */
export function blockPosition(block: CalendarBlock, startHour: number, endHour: number): { top: number; height: number } {
  const shownMinutes = (endHour - startHour) * 60
  return {
    top: ((block.startMinutes - startHour * 60) / shownMinutes) * 100,
    height: ((block.endMinutes - block.startMinutes) / shownMinutes) * 100,
  }
}

/** "10:20:00"–"11:10:00" -> "10:20–11:10 AM"; "11:30:00"–"12:20:00" -> "11:30 AM–12:20 PM" */
export function formatTimeRange(start: string, end: string): string {
  const startText = formatTime(start)
  const endText = formatTime(end)
  const samePeriod = startText.slice(-2) === endText.slice(-2) // both AM or both PM
  return samePeriod ? `${startText.slice(0, -3)}–${endText}` : `${startText}–${endText}`
}

/** 9 -> "9 AM", 12 -> "12 PM", 13 -> "1 PM" */
export function hourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}
