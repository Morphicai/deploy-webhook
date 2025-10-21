import { NavLink } from 'react-router-dom'
import { BarChart3, Zap, Settings, Key } from 'lucide-react'

const menuItems = [
  {
    to: '/',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    to: '/deploy',
    label: 'Deploy',
    icon: Zap,
  },
  {
    to: '/env',
    label: 'Environment',
    icon: Settings,
  },
  {
    to: '/secrets',
    label: 'Secrets',
    icon: Key,
  },
]

export default function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar-light dark:border-border-dark dark:bg-sidebar-dark">
      {/* Logo */}
      <div className="flex h-20 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Deploy Console
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary dark:text-text-secondary-dark dark:hover:bg-surface-darker dark:hover:text-text-primary-dark'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-4 dark:border-border-dark">
        {/* Help Card */}
        <div className="mb-4 rounded-xl bg-surface-light p-4 dark:bg-surface-darker">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24'%3E👋%3C/text%3E%3C/svg%3E"
              alt="Help"
              className="h-8 w-8"
            />
          </div>
          <p className="mb-1 text-xs font-semibold text-text-primary dark:text-text-primary-dark">
            Need help?
          </p>
          <p className="mb-3 text-xs text-text-secondary dark:text-text-secondary-dark">
            Feel free to contact
          </p>
          <button className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-600">
            Get support
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 rounded-xl bg-surface-light p-3 dark:bg-surface-darker">
          <div className="relative">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='16' fill='%235b7bf5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='14' font-weight='600'%3EAD%3C/text%3E%3C/svg%3E"
              alt="Admin"
              className="h-10 w-10 rounded-full"
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar-light bg-success dark:border-sidebar-dark"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate dark:text-text-primary-dark">
              Admin User
            </div>
            <div className="text-xs text-text-secondary truncate dark:text-text-secondary-dark">
              admin@example.com
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

