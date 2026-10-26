import { Avatar } from '@heroui/react'
import type { SidebarUser } from '../../types/chat'
import { AvatarWithOnlineIndicator } from './AvatarWithOnlineIndicator'

type ConversationRowProps = {
  user: SidebarUser
  selected: boolean
  onSelect: () => void
}

export function ConversationRow({
  user,
  selected,
  onSelect,
}: ConversationRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left ${
        selected ? 'bg-accent-soft' : ''
      }`}
    >
      <AvatarWithOnlineIndicator isOnline={user.isOnline}>
        <Avatar className="size-12 shrink-0">
          <Avatar.Image alt={user.name} src={user.avatarUrl} />
          <Avatar.Fallback className="text-sm font-medium">
            {user.initials}
          </Avatar.Fallback>
        </Avatar>
      </AvatarWithOnlineIndicator>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{user.name}</p>
      </div>
    </button>
  )
}
