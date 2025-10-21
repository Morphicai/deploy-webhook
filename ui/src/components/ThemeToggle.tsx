import { useEffect } from 'react'
import { useTheme } from '../store/useTheme'

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDark])

  return (
    <button
      type="button"
      onClick={toggle}
      className="group flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-medium text-text-secondary shadow-soft transition duration-300 ease-in-out-soft hover:bg-brand-100 hover:text-brand-700 hover:shadow-brand dark:bg-surface-darker dark:text-text-softer dark:hover:bg-surface-darker/70 dark:hover:text-brand-300"
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-brand-foreground transition-transform duration-300 ease-in-out-soft group-hover:scale-105"
      >
        {isDark ? '🌙' : '☀️'}
      </span>
      <span>{isDark ? '深色' : '浅色'}</span>
    </button>
  )
}
