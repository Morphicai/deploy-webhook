import type { ReactNode } from 'react'

export default function StatsCard({ title, value, icon }: { title: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <span className="text-emerald-400">{icon}</span>
      </div>
      <span className="text-2xl font-semibold text-white">{value}</span>
    </div>
  )
}
