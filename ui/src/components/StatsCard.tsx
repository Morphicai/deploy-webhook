import type { ReactNode } from 'react'

export default function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendValue,
  iconColor 
}: { 
  title: string
  value: string | number
  icon?: ReactNode
  trend?: 'up' | 'down'
  trendValue?: string
  iconColor?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover dark:border-border-dark dark:bg-surface-dark">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
              {title}
            </h3>
            {icon && (
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor || 'bg-primary/10 text-primary'}`}>
                {icon}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">
              {value}
            </span>
            {trendValue && (
              <span className={`flex items-center gap-1 text-sm font-medium ${
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-text-muted'
              }`}>
                {trend === 'up' ? '↑' : '↓'}
                {trendValue}
              </span>
            )}
          </div>
          {trendValue && (
            <p className="mt-1 text-xs text-text-muted dark:text-text-muted-dark">
              Since last week
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
