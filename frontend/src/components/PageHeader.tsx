import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode // buttons or links shown on the right (below the title on phones)
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <div className="mt-1 space-y-0.5 text-sm text-slate-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
