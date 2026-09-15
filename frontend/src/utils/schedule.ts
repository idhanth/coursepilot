import type { Course } from '../types/course.ts'
import type {
  GenerateSchedulesRequest,
  GenerateSchedulesResponse,
  PreferenceForm,
  SchedulePreferences,
} from '../types/schedule.ts'
import { formatTime } from './format.ts'

// The backend accepts at most 8 courses per request (MAX_COURSES in backend/app/schemas/schedule.py).
export const MAX_COURSES = 8

/**
 * Turns the selected courses and the preferences form into the JSON body for POST /api/schedules/generate.
 * Empty fields are left out, so the backend treats them as "no preference".
 */
export function buildGenerateRequest(courses: Course[], form: PreferenceForm): GenerateSchedulesRequest {
  const preferences: SchedulePreferences = {}
  if (form.earliestStart !== '') preferences.earliest_start = form.earliestStart
  if (form.latestEnd !== '') preferences.latest_end = form.latestEnd
  if (form.preferredDayOff !== '') preferences.preferred_day_off = form.preferredDayOff
  if (form.maxClassesPerDay !== '') preferences.max_classes_per_day = Number(form.maxClassesPerDay)

  const request: GenerateSchedulesRequest = { course_ids: courses.map((course) => course.id) }
  if (Object.keys(preferences).length > 0) {
    request.preferences = preferences
  }
  return request
}

/**
 * The first problem that would make the backend reject the request, or null if there is none.
 * The backend checks the same rules; checking here lets the student fix them before anything is sent.
 */
export function validateScheduleRequest(courses: Course[], form: PreferenceForm): string | null {
  if (courses.length === 0) {
    return 'Select at least one course.'
  }
  if (courses.length > MAX_COURSES) {
    return `Select at most ${MAX_COURSES} courses.`
  }
  if (form.maxClassesPerDay !== '') {
    const max = Number(form.maxClassesPerDay)
    if (!Number.isInteger(max) || max < 1) {
      return 'Maximum classes per day must be a whole number of at least 1.'
    }
  }
  // Times from <input type="time"> are "HH:MM" text, which compares correctly: "09:00" < "15:00".
  if (form.earliestStart !== '' && form.latestEnd !== '' && form.earliestStart >= form.latestEnd) {
    return 'Latest end must be later than earliest start.'
  }
  return null
}

/** A short sentence for each preference that is set, e.g. ["No classes before 9:00 AM", "Friday off"]. */
export function describePreferences(form: PreferenceForm): string[] {
  const descriptions: string[] = []
  if (form.earliestStart !== '') descriptions.push(`No classes before ${formatTime(form.earliestStart)}`)
  if (form.latestEnd !== '') descriptions.push(`Done by ${formatTime(form.latestEnd)}`)
  if (form.preferredDayOff !== '') descriptions.push(`${form.preferredDayOff} off`)
  if (form.maxClassesPerDay !== '') {
    const max = Number(form.maxClassesPerDay)
    descriptions.push(`At most ${max} ${max === 1 ? 'class' : 'classes'} per day`)
  }
  return descriptions
}

export type EmptyResultReason = 'conflicts' | 'preferences'

/** Why the backend returned no schedules, worked out from its counts. null means there are schedules. */
export function emptyResultReason(response: GenerateSchedulesResponse): EmptyResultReason | null {
  if (response.count > 0) {
    return null
  }
  // Every combination had a time conflict: these courses can't fit together at all.
  if (response.conflict_free_count === 0) {
    return 'conflicts'
  }
  // Some schedules had no conflicts, but the preferences removed all of them.
  return 'preferences'
}
