import { useEffect } from 'react'
import { useSelectedConversation } from '../hooks/useSelectedConversation'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import { useWallpaper } from '../context/wallpaper'
import { ChatComposer } from '../components/chat/ChatComposer'
import { ChatHeader } from '../components/chat/ChatHeader'
import ChatSidebar from '../components/chat/ChatSidebar'
import { MessageList } from '../components/chat/MessageList'

function ChatPage() {
  const { frameStyle } = useWallpaper()

  const getConversations = useChatStore((state) => state.getConversations)
  const getMessages = useChatStore((state) => state.getMessages)
  const getUsers = useChatStore((state) => state.getUsers)
  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages)
  const unsubscribeFromMessages = useChatStore(
    (state) => state.unsubscribeFromMessages,
  )
  const socket = useAuthStore((state) => state.socket)

  const { activeConversation, activeConversationId, isLargeScreen } =
    useSelectedConversation()

  useEffect(() => {
    void getUsers()
    void getConversations()
  }, [getConversations, getUsers])

  useEffect(() => {
    if (!activeConversationId) return
    void getMessages(activeConversationId)
  }, [activeConversationId, getMessages])

  useEffect(() => {
    if (!socket) return

    subscribeToMessages()
    return unsubscribeFromMessages
  }, [socket, subscribeToMessages, unsubscribeFromMessages])

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden p-2 sm:p-3 md:p-8"
      style={frameStyle}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden rounded-2xl border border-border bg-background text-foreground">
        <ChatSidebar />

        <div
          className={`flex-1 flex-col overflow-hidden ${
            !isLargeScreen && !activeConversationId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ChatHeader />
          <MessageList />

          {activeConversation ? <ChatComposer /> : null}
        </div>
      </div>
    </div>
  )
}

export default ChatPage
