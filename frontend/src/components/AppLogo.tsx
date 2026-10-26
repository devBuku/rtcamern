export const APP_NAME = 'rtcamern'

interface AppLogoProps {
  className?: string
  size?: number
  alt?: string
}

export function AppLogo({
  className = '',
  size = 32,
  alt = APP_NAME,
}: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-contain select-none ${className}`}
      draggable={false}
    />
  )
}
