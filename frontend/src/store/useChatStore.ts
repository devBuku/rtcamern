import axios from 'axios'
import toast from 'react-hot-toast'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { axiosInstance } from '../lib/axios'
import type { ChatMessage, ChatUser, SidebarTab } from '../types/chat'
import { useAuthStore } from './useAuthStore'

type MessagePayload = FormData | { text: string }

type ChatStore = {
  users: ChatUser[]
  conversations: ChatUser[]
  messages: ChatMessage[]
  isConversationsLoading: boolean
  isUsersLoading: boolean
  isMessagesLoading: boolean
  isSendingMessage: boolean
  isSendingMedia: boolean
  activeConversationId: string | null
  searchQuery: string
  sidebarTab: SidebarTab
  composerText: string
  isSoundEnabled: boolean
  getUsers: () => Promise<void>
  getConversations: () => Promise<void>
  getMessages: (userId: string) => Promise<void>
  sendMessage: (
    recipientId: string,
    messageData: MessagePayload,
  ) => Promise<boolean>
  subscribeToMessages: () => void
  unsubscribeFromMessages: () => void
  setActiveConversationId: (activeConversationId: string | null) => void
  setSearchQuery: (searchQuery: string) => void
  setSidebarTab: (sidebarTab: SidebarTab) => void
  setComposerText: (composerText: string) => void
  setSoundEnabled: (isSoundEnabled: boolean) => void
  sendTextMessage: (conversationId: string | null) => Promise<boolean>
  sendMediaMessage: (args: {
    conversationId: string | null
    file: File
  }) => Promise<boolean>
  reset: () => void
}

let messagesRequestController: AbortController | null = null
let newMessageHandler: ((message: ChatMessage) => void) | null = null
let conversationsRequestId = 0
let storeGeneration = 0

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback
  }

  return fallback
}

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime(),
  )
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      messages: [],
      isConversationsLoading: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      isSendingMessage: false,
      isSendingMedia: false,
      activeConversationId: null,
      searchQuery: '',
      sidebarTab: 'chats',
      composerText: '',
      isSoundEnabled: true,

      getUsers: async () => {
        const generation = storeGeneration
        set({ isUsersLoading: true })

        try {
          const { data } =
            await axiosInstance.get<ChatUser[]>('/messages/users')
          if (generation !== storeGeneration) return

          set((state) => {
            const activeConversationId =
              state.activeConversationId &&
              data.some((user) => user._id === state.activeConversationId)
                ? state.activeConversationId
                : null

            return {
              users: data,
              activeConversationId,
              messages: activeConversationId ? state.messages : [],
              composerText: activeConversationId ? state.composerText : '',
            }
          })
        } catch (error) {
          if (generation === storeGeneration) {
            toast.error(getErrorMessage(error, 'Failed to load users'))
          }
        } finally {
          if (generation === storeGeneration) {
            set({ isUsersLoading: false })
          }
        }
      },

      getConversations: async () => {
        const generation = storeGeneration
        const requestId = ++conversationsRequestId
        set((state) => ({
          isConversationsLoading: state.conversations.length === 0,
        }))

        try {
          const { data } = await axiosInstance.get<ChatUser[]>(
            '/messages/conversations',
          )
          if (
            generation !== storeGeneration ||
            requestId !== conversationsRequestId
          ) {
            return
          }

          set({ conversations: data })
        } catch (error) {
          if (
            generation === storeGeneration &&
            requestId === conversationsRequestId
          ) {
            toast.error(getErrorMessage(error, 'Failed to load conversations'))
          }
        } finally {
          if (
            generation === storeGeneration &&
            requestId === conversationsRequestId
          ) {
            set({ isConversationsLoading: false })
          }
        }
      },

      getMessages: async (userId) => {
        if (!userId) return

        const generation = storeGeneration
        messagesRequestController?.abort()

        const controller = new AbortController()
        messagesRequestController = controller
        set({ isMessagesLoading: true })

        try {
          const { data } = await axiosInstance.get<ChatMessage[]>(
            `/messages/${userId}`,
            { signal: controller.signal },
          )

          if (
            controller.signal.aborted ||
            generation !== storeGeneration ||
            get().activeConversationId !== userId
          ) {
            return
          }

          set((state) => {
            if (state.activeConversationId !== userId) return {}

            const messagesById = new Map(
              data.map((message) => [message._id, message]),
            )

            // A socket message may arrive while the history request is in
            // flight. Keep it instead of overwriting it with the response.
            for (const message of state.messages) {
              if (!messagesById.has(message._id)) {
                messagesById.set(message._id, message)
              }
            }

            return { messages: sortMessages([...messagesById.values()]) }
          })
        } catch (error) {
          if (
            controller.signal.aborted ||
            axios.isCancel(error) ||
            generation !== storeGeneration
          ) {
            return
          }

          if (get().activeConversationId === userId) {
            toast.error(getErrorMessage(error, 'Failed to load messages'))
          }
        } finally {
          if (messagesRequestController === controller) {
            messagesRequestController = null
            if (generation === storeGeneration) {
              set({ isMessagesLoading: false })
            }
          }
        }
      },

      sendMessage: async (recipientId, messageData) => {
        if (!recipientId || get().isSendingMessage) return false

        const generation = storeGeneration
        set({ isSendingMessage: true })

        try {
          const { data } = await axiosInstance.post<ChatMessage>(
            `/messages/send/${recipientId}`,
            messageData,
          )

          if (generation === storeGeneration) {
            set((state) => {
              if (
                state.activeConversationId !== recipientId ||
                state.messages.some((message) => message._id === data._id)
              ) {
                return {}
              }

              return { messages: [...state.messages, data] }
            })

            void get().getConversations()
          }

          return true
        } catch (error) {
          if (generation === storeGeneration) {
            toast.error(getErrorMessage(error, 'Failed to send message'))
          }

          return false
        } finally {
          if (generation === storeGeneration) {
            set({ isSendingMessage: false })
          }
        }
      },

      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket
        if (!socket) return

        if (newMessageHandler) {
          socket.off('newMessage', newMessageHandler)
        }

        const handler = (newMessage: ChatMessage) => {
          const authUser = useAuthStore.getState().authUser
          if (
            !authUser ||
            String(newMessage.receiverId) !== String(authUser._id)
          ) {
            return
          }

          const activeConversationId = get().activeConversationId
          if (
            activeConversationId &&
            String(newMessage.senderId) === activeConversationId
          ) {
            set((state) => {
              if (
                state.activeConversationId !== activeConversationId ||
                state.messages.some((message) => message._id === newMessage._id)
              ) {
                return {}
              }

              return { messages: [...state.messages, newMessage] }
            })
          }

          // Refresh the sidebar for messages in other conversations too.
          void get().getConversations()
        }

        newMessageHandler = handler
        socket.on('newMessage', handler)
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket
        if (socket && newMessageHandler) {
          socket.off('newMessage', newMessageHandler)
        }

        newMessageHandler = null
      },

      setActiveConversationId: (activeConversationId) => {
        set((state) => {
          const isSameConversation =
            state.activeConversationId === activeConversationId

          return {
            activeConversationId,
            messages: isSameConversation ? state.messages : [],
            composerText: isSameConversation ? state.composerText : '',
          }
        })
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setComposerText: (composerText) => set({ composerText }),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),

      sendTextMessage: async (conversationId) => {
        const messageText = get().composerText.trim()
        if (!conversationId || !messageText || get().isSendingMessage) {
          return false
        }

        const didSend = await get().sendMessage(conversationId, {
          text: messageText,
        })

        if (
          didSend &&
          get().activeConversationId === conversationId &&
          get().composerText.trim() === messageText
        ) {
          set({ composerText: '' })
        }

        return didSend
      },

      sendMediaMessage: async ({ conversationId, file }) => {
        if (
          !conversationId ||
          !file ||
          get().isSendingMedia ||
          get().isSendingMessage
        ) {
          return false
        }

        const formData = new FormData()
        formData.append('media', file)

        const generation = storeGeneration
        set({ isSendingMedia: true })
        try {
          return await get().sendMessage(conversationId, formData)
        } finally {
          if (generation === storeGeneration) {
            set({ isSendingMedia: false })
          }
        }
      },

      reset: () => {
        storeGeneration += 1
        messagesRequestController?.abort()
        messagesRequestController = null
        get().unsubscribeFromMessages()

        set({
          users: [],
          conversations: [],
          messages: [],
          isConversationsLoading: false,
          isUsersLoading: false,
          isMessagesLoading: false,
          isSendingMessage: false,
          isSendingMedia: false,
          activeConversationId: null,
          searchQuery: '',
          sidebarTab: 'chats',
          composerText: '',
        })
      },
    }),
    {
      name: 'imessage-storage',
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    },
  ),
)
