import type { PropsWithChildren } from 'react'

export default function PageContainer({ title, description, action, children }: PropsWithChildren<{ title: string; description?: string; action?: React.ReactNode }>) {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-subtle p-6 text-text-primary shadow-soft transition-colors duration-300 ease-in-out-soft md:flex-row md:items-center md:justify-between dark:border-border-dark dark:bg-surface-dark dark:text-text-dark">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-text-secondary dark:text-text-softer">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className="rounded-2xl border border-border bg-surface p-6 text-text-primary shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/80 dark:text-text-dark">
        {children}
      </div>
    </section>
  )
}
