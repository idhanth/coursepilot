import { DAY_NAMES, type GeneratedSchedule } from '../types/schedule.ts'
import { blockPosition, calendarBlocks, calendarDays, calendarHours, formatTimeRange, hourLabel } from '../utils/calendar.ts'

// One color per course. Full class names are written out so Tailwind includes them in the CSS.
const COURSE_COLORS = [
  'border-blue-300 bg-blue-50 text-blue-950',
  'border-emerald-300 bg-emerald-50 text-emerald-950',
  'border-amber-300 bg-amber-50 text-amber-950',
  'border-violet-300 bg-violet-50 text-violet-950',
  'border-rose-300 bg-rose-50 text-rose-950',
  'border-cyan-300 bg-cyan-50 text-cyan-950',
  'border-lime-300 bg-lime-50 text-lime-950',
  'border-orange-300 bg-orange-50 text-orange-950',
]

const HOUR_HEIGHT_REM = 4

export default function WeeklyCalendar({ schedule }: { schedule: GeneratedSchedule }) {
  const blocks = calendarBlocks(schedule)
  const days = calendarDays(blocks)
  const { startHour, endHour } = calendarHours(blocks)
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index)
  const columnHeight = `${hours.length * HOUR_HEIGHT_REM}rem`

  return (
    // On narrow screens the calendar keeps a readable width (wide enough for "11:30 AM–12:20 PM" in
    // each day column) and scrolls sideways inside this box instead of squeezing the text.
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        className="grid min-w-[44rem]"
        style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Header row: an empty corner, then one heading per day */}
        <div className="border-b border-slate-200" />
        {days.map((day) => (
          <div
            key={day}
            className="border-b border-l border-slate-200 px-1 py-2 text-center text-xs font-semibold text-slate-700"
          >
            {DAY_NAMES[day]}
          </div>
        ))}

        {/* Hour labels down the left side */}
        <div className="relative" style={{ height: columnHeight }}>
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-2 text-[11px] text-slate-500"
              style={{ top: `calc(${index * HOUR_HEIGHT_REM}rem + 2px)` }}
            >
              {hourLabel(hour)}
            </span>
          ))}
        </div>

        {/* One column per day. Each class is absolutely positioned by its start time and length. */}
        {days.map((day) => (
          <div key={day} className="relative border-l border-slate-200" style={{ height: columnHeight }}>
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-slate-100"
                style={{ top: `${index * HOUR_HEIGHT_REM}rem` }}
              />
            ))}

            {blocks
              .filter((block) => block.dayOfWeek === day)
              .map((block) => {
                const { top, height } = blockPosition(block, startHour, endHour)
                const timeRange = formatTimeRange(block.startTime, block.endTime)
                return (
                  <div
                    key={block.key}
                    data-testid="calendar-block"
                    title={`${block.courseCode}-${block.sectionNumber} · ${DAY_NAMES[day]} ${timeRange} · ${block.location}`}
                    className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight ${COURSE_COLORS[block.colorIndex % COURSE_COLORS.length]}`}
                    style={{ top: `${top}%`, height: `${height}%` }}
                  >
                    <p className="font-semibold">{block.courseCode}</p>
                    <p>Sec {block.sectionNumber}</p>
                    <p>{timeRange}</p>
                    <span className="sr-only">
                      {DAY_NAMES[day]}, {block.location}
                    </span>
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}
