import { Link, NavLink } from 'react-router'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`
}

export default function Navbar({ selectedCount }: { selectedCount: number }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/courses" className="text-lg font-semibold text-slate-900">
          CoursePilot
        </Link>
        <div className="flex items-center gap-5">
          <NavLink to="/courses" className={navLinkClass}>
            Courses
          </NavLink>
          <NavLink to="/planner" className={navLinkClass}>
            Schedule Builder
            {selectedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{selectedCount}</span>
            )}
          </NavLink>
        </div>
      </nav>
    </header>
  )
}
