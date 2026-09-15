// These match the JSON returned by the FastAPI course endpoints (backend/app/schemas/course.py).

export type Course = {
  id: number
  course_code: string
  course_name: string
  department: string
  description: string | null
  credit_hours: number
}

export type Meeting = {
  day_of_week: number // 0 = Monday ... 6 = Sunday
  start_time: string // "HH:MM:SS"
  end_time: string
}

export type Section = {
  id: number
  course_id: number
  section_number: string
  instructor: string
  location: string
  meetings: Meeting[]
}
