import type { GeneratedSchedule } from '../types/schedule.ts'
import { formatMeetings } from '../utils/format.ts'

export default function ScheduleCard({ schedule }: { schedule: GeneratedSchedule }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Sections</h2>
        <p className="text-sm text-slate-600">{schedule.total_credits} credits</p>
      </div>

      <ul className="mt-2 divide-y divide-slate-100">
        {schedule.sections.map((section) => (
          <li key={section.id} className="py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="font-medium text-slate-900">
                {section.course.course_code}-{section.section_number}
              </span>
              <span className="text-slate-600">{section.instructor}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-slate-600">
              {formatMeetings(section.meetings).map((meeting) => (
                <span key={meeting} className="whitespace-nowrap">
                  {meeting}
                </span>
              ))}
            </div>
            <p className="text-slate-500">{section.location}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
