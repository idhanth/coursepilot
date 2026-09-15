import { useEffect, useState } from 'react'
import { apiGet } from '../services/api.ts'

type Health = { status: string; database: string }

type CheckState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string }

// Phase 1 page: proves the browser can reach FastAPI and FastAPI can reach PostgreSQL.
export default function StatusPage() {
  const [check, setCheck] = useState<CheckState>({ kind: 'loading' })

  useEffect(() => {
    apiGet<Health>('/api/health')
      .then((health) => setCheck({ kind: 'ok', health }))
      .catch((error: Error) => setCheck({ kind: 'error', message: error.message }))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">CoursePilot</h1>
        <p className="mt-1 text-sm text-slate-600">Semester schedule planner</p>

        <dl className="mt-6 space-y-3 text-sm">
          <StatusRow label="Frontend" value="running" ok />
          {check.kind === 'loading' && <StatusRow label="Backend" value="checking…" />}
          {check.kind === 'ok' && (
            <>
              <StatusRow label="Backend" value={check.health.status} ok />
              <StatusRow label="Database" value={check.health.database} ok />
            </>
          )}
          {check.kind === 'error' && <StatusRow label="Backend" value={check.message} ok={false} />}
        </dl>
      </div>
    </main>
  )
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? 'text-slate-500' : ok ? 'text-emerald-700' : 'text-red-700'
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-medium text-slate-700">{label}</dt>
      <dd className={`text-right ${color}`}>{value}</dd>
    </div>
  )
}
