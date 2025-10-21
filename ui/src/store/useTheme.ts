import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  hasExplicitChoice: boolean
  toggle: () => void
  setTheme: (value: boolean) => void
  syncSystemPreference: (value: boolean) => void
}

const storageKey = 'deploy-console-theme'

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return { isDark: false, hasExplicitChoice: false }
  }

  const stored = window.localStorage.getItem(storageKey)
  if (stored === 'dark') {
    return { isDark: true, hasExplicitChoice: true }
  }
  if (stored === 'light') {
    return { isDark: false, hasExplicitChoice: true }
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return { isDark: prefersDark, hasExplicitChoice: false }
}

export const useTheme = create<ThemeState>((set, get) => ({
  ...getInitialState(),
  toggle: () => {
    const next = !get().isDark
    set({ isDark: next, hasExplicitChoice: true })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, next ? 'dark' : 'light')
    }
  },
  setTheme: (value) => {
    set({ isDark: value, hasExplicitChoice: true })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, value ? 'dark' : 'light')
    }
  },
  syncSystemPreference: (value) => {
    if (get().hasExplicitChoice) return
    set({ isDark: value })
  },
}))
