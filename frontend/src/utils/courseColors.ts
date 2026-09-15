// One color per course: a light block for the calendar and a solid dot for the section list.
// Full class names are written out so Tailwind includes them in the CSS.
export const COURSE_COLORS = [
  { block: 'border-blue-300 bg-blue-50 text-blue-950', dot: 'bg-blue-500' },
  { block: 'border-emerald-300 bg-emerald-50 text-emerald-950', dot: 'bg-emerald-500' },
  { block: 'border-amber-300 bg-amber-50 text-amber-950', dot: 'bg-amber-500' },
  { block: 'border-violet-300 bg-violet-50 text-violet-950', dot: 'bg-violet-500' },
  { block: 'border-rose-300 bg-rose-50 text-rose-950', dot: 'bg-rose-500' },
  { block: 'border-cyan-300 bg-cyan-50 text-cyan-950', dot: 'bg-cyan-500' },
  { block: 'border-lime-300 bg-lime-50 text-lime-950', dot: 'bg-lime-600' },
  { block: 'border-orange-300 bg-orange-50 text-orange-950', dot: 'bg-orange-500' },
]

export function courseColor(colorIndex: number) {
  return COURSE_COLORS[colorIndex % COURSE_COLORS.length]
}
