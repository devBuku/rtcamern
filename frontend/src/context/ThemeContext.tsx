import { useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_THEME_PRESET_ID } from '../data/herouiThemePresets'
import type { ThemePresetId } from '../data/herouiThemePresets'
import {
  applyThemePresetToDocument,
  isValidThemePreset,
  ThemeContext,
} from './theme'
import type { ThemeMode } from './theme'

const THEME_STORAGE_KEY = 'theme'
const THEME_PRESET_STORAGE_KEY = 'theme-preset'

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function readStoredTheme(): ThemeMode | null {
  const theme = localStorage.getItem(THEME_STORAGE_KEY)
  if (theme === 'light' || theme === 'dark') return theme

  return null
}

function applyDomTheme(theme: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
}

function readStoredThemePreset(): ThemePresetId {
  const themePreset = localStorage.getItem(THEME_PRESET_STORAGE_KEY)
  if (themePreset && isValidThemePreset(themePreset)) return themePreset

  return DEFAULT_THEME_PRESET_ID
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(
    () => readStoredTheme() ?? getSystemTheme(),
  )
  const [followsSystem, setFollowsSystem] = useState(
    () => readStoredTheme() === null,
  )
  const [themePreset, setThemePresetState] = useState(readStoredThemePreset)

  // this applies light/dark mode
  useLayoutEffect(() => {
    applyDomTheme(theme)
  }, [theme])

  // this applies the theme preset, like sky, spotify, etc.
  useLayoutEffect(() => {
    applyThemePresetToDocument(themePreset)
  }, [themePreset])

  // keep following the OS preference until the user picks a theme explicitly
  useEffect(() => {
    if (!followsSystem) return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? 'dark' : 'light')
    }

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [followsSystem])

  // this stores the theme and theme preset in local storage
  useEffect(() => {
    if (followsSystem) {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }

    localStorage.setItem(THEME_PRESET_STORAGE_KEY, themePreset)
  }, [theme, themePreset, followsSystem])

  const setTheme = (next: ThemeMode) => {
    setFollowsSystem(false)
    setThemeState(next)
  }

  const toggleTheme = () => {
    setFollowsSystem(false)
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  const setThemePreset = (
    next: ThemePresetId | ((prev: ThemePresetId) => ThemePresetId),
  ) => {
    setThemePresetState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      return isValidThemePreset(resolved) ? resolved : DEFAULT_THEME_PRESET_ID
    })
  }

  const value = { theme, setTheme, toggleTheme, themePreset, setThemePreset }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
