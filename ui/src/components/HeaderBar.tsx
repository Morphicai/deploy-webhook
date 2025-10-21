import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthToken, useAuthEmail } from '../hooks/useAuth'

const menu = [
  { to: '/', label: '应用概览' },
  { to: '/deploy', label: '触发部署' },
  { to: '/env', label: '环境变量' },
  { to: '/secrets', label: '秘钥管理' },
]

export default function HeaderBar({ onNavigate }: { onNavigate: (path: string) => void }) {
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
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="select-none text-lg font-semibold tracking-tight text-white">Deploy Console</div>
        <nav className="hidden items-center gap-2 md:flex">
          {menu.map((item) => (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white"
          >
            {initials || 'AD'}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-xl">
              <div className="px-3 py-2 text-xs uppercase tracking-wide text-slate-500">
                {email || '管理员'}
              </div>
              {menu.map((item) => (
                <button
                  key={item.to}
                  onClick={() => {
                    onNavigate(item.to)
                    setDropdownOpen(false)
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
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
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                退出登陆
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
