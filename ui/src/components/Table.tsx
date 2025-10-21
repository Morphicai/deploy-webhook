import type { PropsWithChildren } from 'react'

export function TableWrapper({ children }: PropsWithChildren) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/70">
      {children}
    </div>
  )
}

export function Table({ children }: PropsWithChildren) {
  return <table className="w-full table-fixed border-collapse text-sm text-text-primary dark:text-text-dark">{children}</table>
}

export function THead({ children }: PropsWithChildren) {
  return (
    <thead className="bg-surface-muted/80 text-left text-text-secondary dark:bg-surface-darker/60 dark:text-text-softer">
      {children}
    </thead>
  )
}

export function TRow({ children }: PropsWithChildren) {
  return (
    <tr className="border-b border-border last:border-none transition-colors duration-150 ease-in-out-soft hover:bg-surface-subtle/60 dark:border-border-dark dark:hover:bg-surface-dark/60">
      {children}
    </tr>
  )
}

export function TH({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>
}

export function TD({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>
}
