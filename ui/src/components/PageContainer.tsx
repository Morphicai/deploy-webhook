import type { PropsWithChildren } from 'react'

export default function PageContainer({ title, description, action, children }: PropsWithChildren<{ title: string; description?: string; action?: React.ReactNode }>) {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-100 shadow-xl">{children}</div>
    </section>
  )
}
