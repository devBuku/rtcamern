import type { CSSProperties } from 'react'

export const WALLPAPER_SECTIONS = [
  { id: 'desktop', title: 'Desktop' },
  { id: 'abstract', title: 'Abstract' },
] as const

export const WALLPAPERS = [
  {
    id: 'sonoma-horizon',
    category: 'desktop',
    label: 'Sonoma Horizon',
    url: '/wallpapers/sonoma-horizon.jpg',
    thumbnailUrl: '/wallpapers/thumbs/sonoma-horizon.jpg',
  },
  {
    id: 'redwoods',
    category: 'desktop',
    label: 'Redwoods',
    url: '/wallpapers/redwoods.jpg',
    thumbnailUrl: '/wallpapers/thumbs/redwoods.jpg',
  },
  {
    id: 'utah-evening',
    category: 'desktop',
    label: 'Utah Evening',
    url: '/wallpapers/utah-evening.jpg',
    thumbnailUrl: '/wallpapers/thumbs/utah-evening.jpg',
  },
  {
    id: 'san-francisco-bay',
    category: 'desktop',
    label: 'San Francisco Bay',
    url: '/wallpapers/san-francisco-bay.jpg',
    thumbnailUrl: '/wallpapers/thumbs/san-francisco-bay.jpg',
  },
  {
    id: 'iceland-coast',
    category: 'desktop',
    label: 'Iceland Coast',
    url: '/wallpapers/iceland-coast.jpg',
    thumbnailUrl: '/wallpapers/thumbs/iceland-coast.jpg',
  },
  {
    id: 'new-york-midtown',
    category: 'desktop',
    label: 'New York Midtown',
    url: '/wallpapers/new-york-midtown.jpg',
    thumbnailUrl: '/wallpapers/thumbs/new-york-midtown.jpg',
  },
  {
    id: 'macos-graphic',
    category: 'abstract',
    label: 'macOS Graphic',
    url: '/wallpapers/macos-graphic.jpg',
    thumbnailUrl: '/wallpapers/thumbs/macos-graphic.jpg',
  },
  {
    id: 'radial-yellow',
    category: 'abstract',
    label: 'Radial Yellow',
    url: '/wallpapers/radial-yellow.jpg',
    thumbnailUrl: '/wallpapers/thumbs/radial-yellow.jpg',
  },
  {
    id: 'radial-purple',
    category: 'abstract',
    label: 'Radial Purple',
    url: '/wallpapers/radial-purple.jpg',
    thumbnailUrl: '/wallpapers/thumbs/radial-purple.jpg',
  },
  {
    id: 'radial-green',
    category: 'abstract',
    label: 'Radial Green',
    url: '/wallpapers/radial-green.jpg',
    thumbnailUrl: '/wallpapers/thumbs/radial-green.jpg',
  },
  {
    id: 'radial-blue',
    category: 'abstract',
    label: 'Radial Blue',
    url: '/wallpapers/radial-blue.jpg',
    thumbnailUrl: '/wallpapers/thumbs/radial-blue.jpg',
  },
  {
    id: 'ventura-light',
    category: 'abstract',
    label: 'Ventura',
    url: '/wallpapers/ventura-light.jpg',
    thumbnailUrl: '/wallpapers/thumbs/ventura-light.jpg',
  },
  {
    id: 'ventura-dark',
    category: 'abstract',
    label: 'Ventura Dark',
    url: '/wallpapers/ventura-dark.jpg',
    thumbnailUrl: '/wallpapers/thumbs/ventura-dark.jpg',
  },
] as const

export type Wallpaper = (typeof WALLPAPERS)[number]
export type WallpaperId = Wallpaper['id']

export const DEFAULT_WALLPAPER_ID: WallpaperId = 'sonoma-horizon'

const WALLPAPER_IDS = new Set<string>(WALLPAPERS.map((w) => w.id))

export function isValidWallpaperId(id: string): id is WallpaperId {
  return WALLPAPER_IDS.has(id)
}

export function frameStyleFromUrl(url: string): CSSProperties {
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

export function getWallpaperById(id: string): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]
}
