import type { ScheduleSection } from './schedule.ts'

// These match the saved-schedule endpoints (SaveScheduleRequest, SavedScheduleSummary and
// SavedScheduleDetail in backend/app/schemas/schedule.py).

export type SaveScheduleRequest = {
  name: string
  semester: string
  section_ids: number[]
}

export type SavedScheduleSummary = {
  id: number
  name: string
  semester: string
  created_at: string
  course_codes: string[]
  total_credits: number
}

export type SavedScheduleDetail = SavedScheduleSummary & {
  sections: ScheduleSection[]
}
