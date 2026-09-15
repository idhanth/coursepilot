import type { Section } from '../types/course.ts'
import { formatMeetings } from '../utils/format.ts'

export default function SectionCard({ section }: { section: Section }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap justify-between gap-x-4">
        <span className="font-medium text-slate-900">Section {section.section_number}</span>
        <span className="text-slate-600">{section.instructor}</span>
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-4 text-slate-600">
        {/* Each "MWF 10:20 AM–11:10 AM" stays on one line; on narrow screens whole meetings wrap instead. */}
        <span className="flex flex-wrap gap-x-3">
          {formatMeetings(section.meetings).map((meeting) => (
            <span key={meeting} className="whitespace-nowrap">
              {meeting}
            </span>
          ))}
        </span>
        <span>{section.location}</span>
      </div>
    </div>
  )
}
