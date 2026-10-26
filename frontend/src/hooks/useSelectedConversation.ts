import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import { formatMessageDate, formatMessageTime } from '../lib/utils'
import type {
  ActiveConversation,
  ChatMessage,
  ChatMessageView,
} from '../types/chat'
import { useMediaQuery } from './useMediaQuery'
import type { ChatUser } from '../types/chat'

// John Doe -> JD
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((namePart) => namePart[0])
    .join('')
}

type MapConversationArgs = {
  user: ChatUser
  messages: ChatMessage[]
  authUser: { _id: string } | null
  onlineUsers: string[]
}

// Converts the raw backend user + message documents into the view model the
// chat components render.
function mapUserToConversation({
  user,
  messages,
  authUser,
  onlineUsers,
}: MapConversationArgs): ActiveConversation {
  const mappedMessages: ChatMessageView[] = messages.map((message) => ({
    id: message._id,
    role: String(message.senderId) === String(authUser?._id) ? 'me' : 'them',
    text: message.text ?? '',
    time: formatMessageTime(message.createdAt),
    dateLabel: formatMessageDate(message.createdAt),
    imageUrl: message.image ?? undefined,
    videoUrl: message.video ?? undefined,
  }))

  return {
    id: user._id,
    peer: {
      name: user.fullName,
      subtitle: user.email,
      isOnline: onlineUsers.includes(user._id),
      avatarUrl: user.profilePic,
      initials: getInitials(user.fullName),
    },
    messages: mappedMessages,
  }
}

export function useSelectedConversation() {
  const activeConversationId = useChatStore(
    (state) => state.activeConversationId,
  )
  const conversations = useChatStore((state) => state.conversations)
  const users = useChatStore((state) => state.users)
  const messages = useChatStore((state) => state.messages)

  const authUser = useAuthStore((state) => state.authUser)
  const onlineUsers = useAuthStore((state) => state.onlineUsers)

  const isLargeScreen = useMediaQuery('(min-width: 1024px)')

  const selectedUser = activeConversationId
    ? users.find((user) => user._id === activeConversationId) ||
      conversations.find((user) => user._id === activeConversationId)
    : null

  const activeConversation = selectedUser
    ? mapUserToConversation({
        user: selectedUser,
        messages,
        authUser,
        onlineUsers,
      })
    : null

  return {
    activeConversation,
    // If the stored id no longer resolves to a user, treat it as no active
    // conversation so mobile layouts do not hide the sidebar with no way back.
    activeConversationId: selectedUser ? activeConversationId : null,
    isLargeScreen,
  }
}
