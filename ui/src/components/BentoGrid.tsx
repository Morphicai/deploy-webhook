import type { ReactNode } from 'react'

interface BentoGridProps {
  children: ReactNode
  className?: string
}

interface BentoCardProps {
  children: ReactNode
  className?: string
  span?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  gradient?: boolean
}

export function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-[140px] ${className}`}>
      {children}
    </div>
  )
}

export function BentoCard({ children, className = '', span = 'sm', gradient = false }: BentoCardProps) {
  const spanClasses = {
    sm: 'col-span-1 row-span-1',
    md: 'md:col-span-2 row-span-1',
    lg: 'md:col-span-2 row-span-2',
    xl: 'lg:col-span-3 row-span-2',
    full: 'md:col-span-2 lg:col-span-4 row-span-1',
  }

  const gradientBg = gradient
    ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
    : ''

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border border-border bg-surface 
        p-6 shadow-card transition-all duration-300 
        hover:shadow-card-hover hover:-translate-y-0.5
        dark:border-border-dark dark:bg-surface-dark
        ${spanClasses[span]}
        ${gradientBg}
        ${className}
      `}
    >
      {/* Hover effect overlay */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  )
}

interface BentoStatCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: 'up' | 'down'
  trendValue?: string
  description?: string
  iconColor?: string
}

export function BentoStatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  description,
  iconColor = 'bg-primary/10 text-primary'
}: BentoStatCardProps) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">
              {value}
            </h3>
            {trendValue && (
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${
                  trend === 'up'
                    ? 'text-success'
                    : trend === 'down'
                    ? 'text-error'
                    : 'text-text-muted'
                }`}
              >
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''}
                {trendValue}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconColor}`}>
            {icon}
          </div>
        )}
      </div>
      {description && (
        <p className="mt-auto text-xs text-text-muted dark:text-text-muted-dark">
          {description}
        </p>
      )}
    </>
  )
}

interface BentoChartCardProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function BentoChartCard({ title, children, action }: BentoChartCardProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </>
  )
}

