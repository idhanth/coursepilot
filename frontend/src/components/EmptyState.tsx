import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  message: string
  children?: ReactNode // optional buttons or links
}

export default function EmptyState({ title, message, children }: EmptyStateProps) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{message}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}
