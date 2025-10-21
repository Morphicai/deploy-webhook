import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthToken, useAuthEmail } from '../hooks/useAuth'

const menu = [
  { to: '/', label: '应用概览' },
  { to: '/deploy', label: '触发部署' },
  { to: '/env', label: '环境变量' },
  { to: '/secrets', label: '秘钥管理' },
]

export default function HeaderBar({
  onNavigate,
  extra,
}: {
  onNavigate: (path: string) => void
  extra?: ReactNode
}) {
  const navigate = useNavigate()
  const { email } = useAuthEmail()
  const { setToken } = useAuthToken()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const initials = useMemo(() => {
    if (!email) return 'AD'
    return email
      .split('@')[0]
      .split(/[\.\-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }, [email])

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface-subtle/80 backdrop-blur transition-colors duration-500 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="select-none text-lg font-semibold tracking-tight text-text-primary dark:text-text-dark">
          Deploy Console
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {menu.map((item) => (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              className="rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition duration-300 ease-in-out-soft hover:bg-brand-100 hover:text-brand-700 dark:text-text-softer dark:hover:bg-surface-darker/80 dark:hover:text-brand-300"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {extra}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white shadow-brand transition duration-300 ease-in-out-soft hover:shadow-brand/70"
            >
              {initials || 'AD'}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border-dark bg-surface-dark/95 p-2 shadow-soft backdrop-blur">
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-softer">
                  {email || '管理员'}
                </div>
                {menu.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => {
                      onNavigate(item.to)
                      setDropdownOpen(false)
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition duration-200 ease-in-out-soft hover:bg-brand-100 hover:text-brand-700 dark:text-text-softer dark:hover:bg-surface-darker/80 dark:hover:text-brand-300"
                  >
                    {item.label}
                  </button>
                ))}
              <button
                onClick={() => {
                  setToken(null)
                  setDropdownOpen(false)
                  navigate('/login', { replace: true })
                }}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition duration-200 ease-in-out-soft hover:bg-red-500/10 hover:text-red-300"
              >
                退出登陆
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  )
}
