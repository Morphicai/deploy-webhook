import type { PropsWithChildren } from 'react'

export default function PageContainer({ 
  title, 
  description, 
  action, 
  children 
}: PropsWithChildren<{ 
  title: string
  description?: string
  action?: React.ReactNode 
}>) {
  return (
    <section className="space-y-4">
      {(title || description || action) && (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {(title || description) && (
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
                  {description}
                </p>
              )}
            </div>
          )}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>
      )}
      
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card dark:border-border-dark dark:bg-surface-dark">
        {children}
      </div>
    </section>
  )
}
