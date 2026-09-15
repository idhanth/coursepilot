import { Link, NavLink } from 'react-router'

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/courses" className="text-lg font-semibold text-slate-900">
          CoursePilot
        </Link>
        <NavLink
          to="/courses"
          className={({ isActive }) =>
            `text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`
          }
        >
          Courses
        </NavLink>
      </nav>
    </header>
  )
}
