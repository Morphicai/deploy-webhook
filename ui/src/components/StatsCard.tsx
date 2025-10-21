import type { ReactNode } from 'react'

export default function StatsCard({ title, value, icon }: { title: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle p-5 text-text-primary shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-dark dark:text-text-dark">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-text-softer">{title}</span>
        <span className="text-brand-500 dark:text-brand-300">{icon}</span>
      </div>
      <span className="text-3xl font-semibold text-text-primary dark:text-text-dark">{value}</span>
    </div>
  )
}
