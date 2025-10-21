import type { PropsWithChildren } from 'react'

export function TableWrapper({ children }: PropsWithChildren) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card dark:border-border-dark dark:bg-surface-dark">
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  )
}

export function Table({ children }: PropsWithChildren) {
  return (
    <table className="w-full table-fixed border-collapse">
      {children}
    </table>
  )
}

export function THead({ children }: PropsWithChildren) {
  return (
    <thead className="border-b border-border bg-surface-light dark:border-border-dark dark:bg-surface-darker">
      {children}
    </thead>
  )
}

export function TRow({ children }: PropsWithChildren) {
  return (
    <tr className="border-b border-border transition-colors last:border-none hover:bg-surface-light dark:border-border-dark dark:hover:bg-surface-darker">
      {children}
    </tr>
  )
}

export function TH({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark ${className}`}>
      {children}
    </th>
  )
}

export function TD({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <td className={`px-6 py-4 text-sm text-text-primary dark:text-text-primary-dark ${className}`}>
      {children}
    </td>
  )
}
