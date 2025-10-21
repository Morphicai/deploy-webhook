import { useTheme } from '../store/useTheme'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-text-secondary shadow-sm transition-all hover:bg-surface-light hover:text-primary hover:shadow dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-darker dark:hover:text-primary"
      aria-label={isDark ? '切换到浅色模式' : '切换到暗色模式'}
      title={isDark ? '切换到浅色模式' : '切换到暗色模式'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
