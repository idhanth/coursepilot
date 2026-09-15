type ScheduleNavigatorProps = {
  position: number // index of the schedule being shown, starting at 0
  count: number
  onPrevious: () => void
  onNext: () => void
}

const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'

export default function ScheduleNavigator({ position, count, onPrevious, onNext }: ScheduleNavigatorProps) {
  return (
    <nav aria-label="Schedule navigation" className="flex items-center justify-between gap-3">
      <button type="button" onClick={onPrevious} disabled={position === 0} className={buttonClass}>
        Previous
      </button>
      <p className="text-sm font-medium text-slate-800" aria-live="polite">
        Schedule {position + 1} of {count}
      </p>
      <button type="button" onClick={onNext} disabled={position === count - 1} className={buttonClass}>
        Next
      </button>
    </nav>
  )
}
