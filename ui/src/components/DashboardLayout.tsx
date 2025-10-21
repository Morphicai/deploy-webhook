import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAdminToken } from '../hooks/useAdminToken'

const navItems = [
  { to: '/', label: '应用概览' },
  { to: '/deploy', label: '触发部署' },
  { to: '/env', label: '环境变量' },
  { to: '/secrets', label: '秘钥管理' },
]

const getLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
  }`

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { token, setToken } = useAdminToken()
  const [input, setInput] = useState(token ?? '')

  useEffect(() => {
    if (!token) {
      navigate('/deploy')
    }
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Deploy Webhook 控制台</h1>
            <p className="text-sm text-slate-500">管理环境变量、秘钥并手动触发部署</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="password"
              placeholder="Admin Token"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              onClick={() => setToken(input || null)}
              className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              保存
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={getLinkClass} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 rounded-xl bg-white p-6 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
