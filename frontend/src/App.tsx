import { Navigate, Route, Routes } from 'react-router'
import Navbar from './components/Navbar.tsx'
import CourseSearchPage from './pages/CourseSearchPage.tsx'
import StatusPage from './pages/StatusPage.tsx'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/courses" element={<CourseSearchPage />} />
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </div>
  )
}
