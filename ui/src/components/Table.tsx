import type { PropsWithChildren } from 'react'

export function TableWrapper({ children }: PropsWithChildren) {
  return <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-lg">{children}</div>
}

export function Table({ children }: PropsWithChildren) {
  return <table className="w-full table-fixed border-collapse text-sm text-slate-100">{children}</table>
}

export function THead({ children }: PropsWithChildren) {
  return <thead className="bg-slate-900/60 text-left text-slate-400">{children}</thead>
}

export function TRow({ children }: PropsWithChildren) {
  return <tr className="border-b border-slate-800 last:border-none">{children}</tr>
}

export function TH({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <th className={`px-4 py-3 text-xs uppercase tracking-wide ${className}`}>{children}</th>
}

export function TD({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>
}
