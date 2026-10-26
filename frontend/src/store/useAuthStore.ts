import axios from 'axios'
import { io, type Socket } from 'socket.io-client'
import { create } from 'zustand'
import { axiosInstance } from '../lib/axios'
import { SOCKET_URL } from '../lib/config'

type AuthUser = { _id: string }
type AuthResponse = { success: true; user: AuthUser }

type AuthStore = {
  authUser: AuthUser | null
  authError: string | null
  isCheckingAuth: boolean
  onlineUsers: string[]
  socket: Socket | null
  checkAuth: () => Promise<void>
  clearAuth: () => void
  connectSocket: (user: AuthUser | null) => void
  disconnectSocket: () => void
}

let authRequestController: AbortController | null = null
let socketUserId: string | null = null

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  authError: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    authRequestController?.abort()

    const controller = new AbortController()
    authRequestController = controller

    set({ isCheckingAuth: true, authError: null })

    try {
      const { data } = await axiosInstance.get<AuthResponse>('/auth/me', {
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      set({ authUser: data.user })
      get().connectSocket(data.user)
    } catch (error) {
      if (controller.signal.aborted || axios.isCancel(error)) return

      console.error('Error in checkAuth:', error)

      const authError =
        axios.isAxiosError(error) && error.response?.status === 404
          ? 'Your account is still being set up. Try again in a moment.'
          : 'Check your connection and try again.'

      set({ authUser: null, authError })
      get().disconnectSocket()
    } finally {
      if (authRequestController === controller) {
        authRequestController = null
        set({ isCheckingAuth: false })
      }
    }
  },

  clearAuth: () => {
    authRequestController?.abort()
    authRequestController = null

    set({ authUser: null, authError: null, isCheckingAuth: false })
    get().disconnectSocket()
  },

  connectSocket: (user) => {
    if (!user) {
      get().disconnectSocket()
      return
    }

    const existing = get().socket

    if (existing && socketUserId === user._id) return

    if (existing) {
      existing.off('getOnlineUsers')
      existing.disconnect()
    }

    const socket = io(SOCKET_URL, { query: { userId: user._id } })
    socketUserId = user._id
    set({ socket })

    socket.on('getOnlineUsers', (userIds: string[]) => {
      set({ onlineUsers: userIds })
    })
  },

  disconnectSocket: () => {
    const socket = get().socket
    socketUserId = null

    if (socket) {
      socket.off('getOnlineUsers')
      socket.disconnect()
    }

    set({ socket: null, onlineUsers: [] })
  },
}))
