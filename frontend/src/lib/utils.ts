export function formatMessageTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMessageDate(date: Date | string): string {
  const messageDate = new Date(date)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (messageDate.toDateString() === today.toDateString()) return 'Today'
  if (messageDate.toDateString() === yesterday.toDateString())
    return 'Yesterday'

  return messageDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
