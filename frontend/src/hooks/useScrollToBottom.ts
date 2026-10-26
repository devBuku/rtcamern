import { useEffect, useRef } from 'react'

/**
 * Scrolls a container to the bottom when `threadKey` or `lastItemId` changes
 * (e.g. new message or switched conversation). Returns a ref for the scrollable element.
 */
function useScrollToBottom(threadKey: string | null, lastItemId?: string) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!threadKey) return

    const el = scrollRef.current
    if (!el) return

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight
    }

    scrollToBottom()
    const frame = requestAnimationFrame(scrollToBottom)

    return () => cancelAnimationFrame(frame)
  }, [threadKey, lastItemId])

  return scrollRef
}

export default useScrollToBottom
