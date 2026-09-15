import { Link, NavLink } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`
}

export default function Navbar({ selectedCount }: { selectedCount: number }) {
  const { user, checking, logout } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/courses" className="text-lg font-semibold text-slate-900">
          CoursePilot
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <NavLink to="/courses" className={navLinkClass}>
            Courses
          </NavLink>
          <NavLink to="/planner" className={navLinkClass}>
            Schedule Builder
            {selectedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{selectedCount}</span>
            )}
          </NavLink>
          {/* While a saved token is being checked, show neither set of links to avoid a flicker. */}
          {!checking && user !== null && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <button type="button" onClick={logout} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Log out
              </button>
            </>
          )}
          {!checking && user === null && (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <NavLink to="/register" className={navLinkClass}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
