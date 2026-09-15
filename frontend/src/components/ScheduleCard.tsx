import { cardClass } from '../styles.ts'
import type { GeneratedSchedule } from '../types/schedule.ts'
import { byCourseCode, courseColorIndexes } from '../utils/calendar.ts'
import { courseColor } from '../utils/courseColors.ts'
import { formatMeetings } from '../utils/format.ts'

export default function ScheduleCard({ schedule }: { schedule: GeneratedSchedule }) {
  const colorIndexes = courseColorIndexes(schedule)
  // Course-code order, so the list looks the same before and after the schedule is saved.
  const sections = [...schedule.sections].sort(byCourseCode)

  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Sections</h2>
        <p className="text-sm text-slate-600">{schedule.total_credits} credits</p>
      </div>

      <ul className="mt-2 divide-y divide-slate-100">
        {sections.map((section) => (
          <li key={section.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <span className="flex items-center gap-2">
                {/* The same color as this course's blocks on the calendar */}
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${courseColor(colorIndexes.get(section.course.course_code) ?? 0).dot}`}
                />
                <span className="font-medium text-slate-900">
                  {section.course.course_code}-{section.section_number}
                </span>
              </span>
              <span className="text-slate-600">{section.instructor}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 pl-4.5 text-slate-600">
              {formatMeetings(section.meetings).map((meeting) => (
                <span key={meeting} className="whitespace-nowrap">
                  {meeting}
                </span>
              ))}
            </div>
            <p className="pl-4.5 text-slate-500">{section.location}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
