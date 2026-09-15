import type { Section } from './course.ts'

// Index = day_of_week (0 = Monday). These are also the day names the backend accepts.
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export type DayName = (typeof DAY_NAMES)[number]

/** What the preferences form holds. Inputs produce strings, and '' means "no preference". */
export type PreferenceForm = {
  earliestStart: string // "HH:MM" from <input type="time">
  latestEnd: string
  preferredDayOff: DayName | ''
  maxClassesPerDay: string // text from <input type="number">
}

export const EMPTY_PREFERENCES: PreferenceForm = {
  earliestStart: '',
  latestEnd: '',
  preferredDayOff: '',
  maxClassesPerDay: '',
}

// The request and response of POST /api/schedules/generate (backend/app/schemas/schedule.py).

export type SchedulePreferences = {
  earliest_start?: string
  latest_end?: string
  preferred_day_off?: DayName
  max_classes_per_day?: number
}

export type GenerateSchedulesRequest = {
  course_ids: number[]
  preferences?: SchedulePreferences
}

export type CourseSummary = {
  id: number
  course_code: string
  course_name: string
  credit_hours: number
}

export type ScheduleSection = Section & { course: CourseSummary }

export type GeneratedSchedule = {
  sections: ScheduleSection[] // one per selected course
  total_credits: number
}

export type GenerateSchedulesResponse = {
  total_combinations: number // every one-section-per-course combination
  conflict_free_count: number // combinations without time conflicts, before preferences
  count: number // schedules that also match the preferences
  schedules: GeneratedSchedule[]
}
