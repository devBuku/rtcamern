import { createContext, useContext } from 'react'
import type { CSSProperties } from 'react'
import type { Wallpaper, WallpaperId } from '../data/wallpapers'

export interface WallpaperContextValue {
  wallpaperId: WallpaperId
  setWallpaperId: (id: WallpaperId) => void
  wallpaper: Wallpaper
  frameStyle: CSSProperties
}

export const WallpaperContext = createContext<WallpaperContextValue | null>(
  null,
)

export function useWallpaper() {
  const ctx = useContext(WallpaperContext)

  if (!ctx) {
    throw new Error('useWallpaper must be used within WallpaperProvider')
  }
  return ctx
}
