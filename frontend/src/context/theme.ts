import { createContext, useContext } from 'react'
import {
  DEFAULT_THEME_PRESET_ID,
  HERO_UI_THEME_PRESETS,
} from '../data/herouiThemePresets'
import type { ThemePresetId } from '../data/herouiThemePresets'

export type ThemeMode = 'light' | 'dark'

export interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  themePreset: ThemePresetId
  setThemePreset: (
    next: ThemePresetId | ((prev: ThemePresetId) => ThemePresetId),
  ) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

const PRESET_IDS = new Set<string>(
  HERO_UI_THEME_PRESETS.map((preset) => preset.id),
)

export function isValidThemePreset(
  presetId: string,
): presetId is ThemePresetId {
  return PRESET_IDS.has(presetId)
}

/** apply preset to `<html>` immediately so `--accent` updates before paint. */
export function applyThemePresetToDocument(presetId: string) {
  const id = isValidThemePreset(presetId) ? presetId : DEFAULT_THEME_PRESET_ID
  document.documentElement.setAttribute('data-theme-preset', id)
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
