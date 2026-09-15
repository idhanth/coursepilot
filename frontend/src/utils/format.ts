import type { Meeting } from '../types/course.ts'

// Index = day_of_week (0 = Monday). R is Thursday, as in most course catalogs.
const DAY_LETTERS = ['M', 'T', 'W', 'R', 'F', 'S', 'U']

/** "2026-09-15T12:01:47-04:00" -> "Sep 15, 2026" (in the viewer's time zone) */
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "13:50:00" -> "1:50 PM" */
export function formatTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

/**
 * Groups meetings that share the same times, so three rows for Monday, Wednesday and Friday
 * at 10:20–11:10 become "MWF 10:20 AM–11:10 AM". Meetings arrive sorted by day from the API.
 */
export function formatMeetings(meetings: Meeting[]): string[] {
  const daysByTime = new Map<string, string>()
  for (const meeting of meetings) {
    const times = `${formatTime(meeting.start_time)}–${formatTime(meeting.end_time)}`
    daysByTime.set(times, (daysByTime.get(times) ?? '') + DAY_LETTERS[meeting.day_of_week])
  }
  return [...daysByTime].map(([times, days]) => `${days} ${times}`)
}
