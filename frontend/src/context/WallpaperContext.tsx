import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DEFAULT_WALLPAPER_ID,
  frameStyleFromUrl,
  getWallpaperById,
  isValidWallpaperId,
} from '../data/wallpapers'
import type { WallpaperId } from '../data/wallpapers'
import { WallpaperContext } from './wallpaper'

const STORAGE_KEY = 'chat-wallpaper-id'

function readStoredWallpaperId(): WallpaperId {
  const wallpaperId = localStorage.getItem(STORAGE_KEY)
  if (wallpaperId && isValidWallpaperId(wallpaperId)) return wallpaperId

  return DEFAULT_WALLPAPER_ID
}

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [wallpaperId, setWallpaperIdState] = useState(readStoredWallpaperId)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, wallpaperId)
  }, [wallpaperId])

  const wallpaper = getWallpaperById(wallpaperId)

  const setWallpaperId = (id: WallpaperId) => {
    setWallpaperIdState(id)
  }

  const frameStyle = frameStyleFromUrl(wallpaper.url)

  return (
    <WallpaperContext.Provider
      value={{ wallpaperId, setWallpaperId, wallpaper, frameStyle }}
    >
      {children}
    </WallpaperContext.Provider>
  )
}
