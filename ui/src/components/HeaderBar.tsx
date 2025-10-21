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
    <header className="sticky top-0 z-20 border-b border-border/60 bg-surface/80 backdrop-blur-xl transition-all duration-300 dark:border-border-dark/60 dark:bg-surface-darker/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-md">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="select-none">
            <div className="text-base font-bold tracking-tight text-text-primary dark:text-text-dark">
              Deploy Console
            </div>
          </div>
        </div>

        {/* 导航菜单 - 桌面端 */}
        <nav className="hidden items-center gap-2 md:flex">
          {menu.map((item) => (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              className="group relative rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:text-brand-600 dark:text-text-softer dark:hover:text-brand-400"
            >
              <span className="relative z-10">{item.label}</span>
              <span className="absolute inset-0 scale-95 rounded-lg bg-brand-50 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 dark:bg-brand-500/10" />
            </button>
          ))}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-3">
          {extra}
          
          {/* 用户菜单 */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-brand"
            >
              {initials || 'AD'}
            </button>
            
            {dropdownOpen && (
              <>
                {/* 遮罩层 */}
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setDropdownOpen(false)}
                />
                
                {/* 下拉菜单 */}
                <div className="absolute right-0 z-40 mt-2 w-56 animate-scale-in overflow-hidden rounded-2xl border border-border bg-surface shadow-soft-lg backdrop-blur-xl dark:border-border-dark dark:bg-surface-dark">
                  <div className="border-b border-border px-4 py-3 dark:border-border-dark">
                    <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      账户信息
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-text-primary dark:text-text-dark">
                      {email || '管理员'}
                    </div>
                  </div>
                  
                  {/* 移动端菜单 */}
                  <div className="md:hidden">
                    <div className="px-2 py-2">
                      {menu.map((item) => (
                        <button
                          key={item.to}
                          onClick={() => {
                            onNavigate(item.to)
                            setDropdownOpen(false)
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-brand-50 hover:text-brand-600 dark:text-text-softer dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="h-px bg-border dark:bg-border-dark" />
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setToken(null)
                        setDropdownOpen(false)
                        navigate('/login', { replace: true })
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-error transition-colors duration-150 hover:bg-error/10"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        退出登录
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
