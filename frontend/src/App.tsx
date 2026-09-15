import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import Navbar from './components/Navbar.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import CourseSearchPage from './pages/CourseSearchPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import PlannerPage from './pages/PlannerPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import ResultsPage from './pages/ResultsPage.tsx'
import SavedSchedulePage from './pages/SavedSchedulePage.tsx'
import StatusPage from './pages/StatusPage.tsx'
import type { Course } from './types/course.ts'
import { EMPTY_PREFERENCES, type PreferenceForm } from './types/schedule.ts'

export default function App() {
  // The course selection and the preferences live here, above the pages, so the search page,
  // the schedule builder and the results page all read and change the same values.
  // They are kept in memory only, so a page refresh starts over. Saved schedules live in PostgreSQL.
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([])
  const [preferences, setPreferences] = useState<PreferenceForm>(EMPTY_PREFERENCES)

  function addCourse(course: Course) {
    setSelectedCourses((selected) =>
      selected.some((existing) => existing.id === course.id) ? selected : [...selected, course],
    )
  }

  function removeCourse(courseId: number) {
    setSelectedCourses((selected) => selected.filter((course) => course.id !== courseId))
  }

  function clearCourses() {
    setSelectedCourses([])
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar selectedCount={selectedCourses.length} />
      <Routes>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/courses"
          element={
            <CourseSearchPage
              selectedCourses={selectedCourses}
              onAddCourse={addCourse}
              onRemoveCourse={removeCourse}
              onClearCourses={clearCourses}
            />
          }
        />
        <Route
          path="/planner"
          element={
            <PlannerPage
              selectedCourses={selectedCourses}
              onRemoveCourse={removeCourse}
              preferences={preferences}
              onPreferencesChange={setPreferences}
            />
          }
        />
        <Route path="/results" element={<ResultsPage selectedCourses={selectedCourses} preferences={preferences} />} />
        {/* Pages for a logged-in user only */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/saved/:id"
          element={
            <RequireAuth>
              <SavedSchedulePage />
            </RequireAuth>
          }
        />
        <Route path="/status" element={<StatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}
