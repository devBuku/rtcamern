import { UserButton } from '@clerk/react'
import { SearchField, Tabs } from '@heroui/react'
import { MessageSquareIcon, UsersIcon } from 'lucide-react'
import {
  getInitials,
  useSelectedConversation,
} from '../../hooks/useSelectedConversation'
import { useAuthStore } from '../../store/useAuthStore'
import { useChatStore } from '../../store/useChatStore'
import type { ChatUser, SidebarUser } from '../../types/chat'
import { APP_NAME, AppLogo } from '../AppLogo'
import { ConversationRow } from './ConversationRow'

function mapUserForList(user: ChatUser, onlineUsers: string[]): SidebarUser {
  const isOnline = onlineUsers.includes(user._id)

  return {
    conversationId: user._id,
    id: user._id,
    name: user.fullName,
    avatarUrl: user.profilePic,
    initials: getInitials(user.fullName),
    isOnline,
    peer: {
      name: user.fullName,
      subtitle: user.email,
      avatarUrl: user.profilePic,
      initials: getInitials(user.fullName),
      isOnline,
    },
  }
}

function ChatSidebar() {
  const conversations = useChatStore((state) => state.conversations)
  const users = useChatStore((state) => state.users)
  const isConversationsLoading = useChatStore(
    (state) => state.isConversationsLoading,
  )
  const isUsersLoading = useChatStore((state) => state.isUsersLoading)

  const searchQuery = useChatStore((state) => state.searchQuery)
  const setSearchQuery = useChatStore((state) => state.setSearchQuery)

  const sidebarTab = useChatStore((state) => state.sidebarTab)
  const setSidebarTab = useChatStore((state) => state.setSidebarTab)

  const setActiveConversationId = useChatStore(
    (state) => state.setActiveConversationId,
  )

  const onlineUsers = useAuthStore((state) => state.onlineUsers)

  const { activeConversationId, isLargeScreen } = useSelectedConversation()

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const conversationUsers = conversations.map((user) =>
    mapUserForList(user, onlineUsers),
  )
  const allUsers = users.map((user) => mapUserForList(user, onlineUsers))

  const filteredConversations = normalizedSearchQuery
    ? conversationUsers.filter((conversation) =>
        conversation.peer.name.toLowerCase().includes(normalizedSearchQuery),
      )
    : conversationUsers

  const filteredUsers = normalizedSearchQuery
    ? allUsers.filter((user) =>
        user.name.toLowerCase().includes(normalizedSearchQuery),
      )
    : allUsers

  return (
    <aside
      className={`w-full shrink-0 flex-col overflow-hidden border-r border-border lg:w-72 ${
        !isLargeScreen && activeConversationId ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <div className="shrink-0 border-b border-border px-2 pb-2 pt-2.5 sm:px-3 sm:pt-3">
        <div className="flex items-center gap-2 px-0.5 sm:gap-2.5 sm:px-1">
          <AppLogo
            size={32}
            className="size-8 shrink-0 rounded-[9px] sm:size-8.5"
            alt=""
          />
          <p className="flex-1 truncate text-lg font-bold tracking-tight sm:text-[22px]">
            {APP_NAME}
          </p>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'size-8',
              },
            }}
          />
        </div>
      </div>

      <Tabs
        selectedKey={sidebarTab}
        onSelectionChange={(key) =>
          setSidebarTab(String(key) === 'users' ? 'users' : 'chats')
        }
        variant="secondary"
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="shrink-0 border-b border-border px-3 pb-2 pt-2">
          <SearchField
            fullWidth
            variant="secondary"
            className="w-full"
            value={searchQuery}
            onChange={setSearchQuery}
          >
            <SearchField.Group className="rounded-xl">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search" />
              {searchQuery ? <SearchField.ClearButton /> : null}
            </SearchField.Group>
          </SearchField>
        </div>

        <Tabs.ListContainer className="shrink-0 border-b border-border px-2 pb-2 pt-1">
          <Tabs.List className="w-full gap-0.5">
            <Tabs.Tab id="chats" className="flex-1 justify-center gap-1.5">
              <MessageSquareIcon className="size-3.5 opacity-80" aria-hidden />
              Chats
            </Tabs.Tab>
            <Tabs.Tab id="users" className="flex-1 justify-center gap-1.5">
              <UsersIcon className="size-3.5 opacity-80" aria-hidden />
              Users
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          id="chats"
          className="flex-1 overflow-x-hidden overflow-y-auto outline-none"
        >
          {isConversationsLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Loading conversations...
            </p>
          ) : filteredConversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              {normalizedSearchQuery
                ? 'No conversations match your search.'
                : 'No conversations yet.'}
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                user={conversation}
                selected={conversation.id === activeConversationId}
                onSelect={() => setActiveConversationId(conversation.id)}
              />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel
          id="users"
          className="flex-1 overflow-x-hidden overflow-y-auto outline-none"
        >
          {isUsersLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Loading people...
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              {normalizedSearchQuery
                ? 'No people match your search.'
                : 'No people yet.'}
            </p>
          ) : (
            filteredUsers.map((user) => (
              <ConversationRow
                key={user.conversationId}
                user={user}
                selected={user.conversationId === activeConversationId}
                onSelect={() => setActiveConversationId(user.conversationId)}
              />
            ))
          )}
        </Tabs.Panel>
      </Tabs>
    </aside>
  )
}

export default ChatSidebar
