import { Link, NavLink } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import { buttonClass } from '../styles.ts'

const focusRing = 'rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `whitespace-nowrap text-sm font-medium ${focusRing} ${isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`
}

export default function Navbar({ selectedCount }: { selectedCount: number }) {
  const { user, checking, logout } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Phones: the brand and account actions share the first row and the page links sit on a second row.
          From 768px wide, everything fits on one row. */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        <Link to="/courses" className={`flex items-center gap-2 text-lg font-semibold text-slate-900 ${focusRing}`}>
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          CoursePilot
        </Link>

        <div className="order-last flex w-full items-center gap-5 border-t border-slate-100 pt-3 md:order-none md:ml-auto md:w-auto md:border-0 md:pt-0">
          <NavLink to="/courses" className={navLinkClass}>
            Courses
          </NavLink>
          <NavLink to="/planner" className={navLinkClass}>
            Schedule Builder
            {selectedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{selectedCount}</span>
            )}
          </NavLink>
          {!checking && user !== null && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
        </div>

        {/* While a saved token is being checked, neither set of account links is shown, to avoid a flicker. */}
        <div className="flex min-h-8 items-center gap-4">
          {!checking && user !== null && (
            <button
              type="button"
              onClick={logout}
              className={`text-sm font-medium text-slate-600 hover:text-slate-900 ${focusRing}`}
            >
              Log out
            </button>
          )}
          {!checking && user === null && (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <Link to="/register" className={buttonClass('primary', 'sm')}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
