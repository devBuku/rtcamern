export type ChatUser = {
  _id: string
  email: string
  fullName: string
  profilePic: string
}

export type ChatMessage = {
  _id: string
  senderId: string
  receiverId: string
  text?: string | null
  image?: string | null
  video?: string | null
  createdAt: string
  updatedAt?: string
}

export type ChatMessageView = {
  id: string
  role: 'me' | 'them'
  text: string
  time: string
  dateLabel: string
  imageUrl?: string
  videoUrl?: string
}

export type ConversationPeer = {
  name: string
  subtitle: string
  isOnline: boolean
  avatarUrl: string
  initials: string
}

export type ActiveConversation = {
  id: string
  peer: ConversationPeer
  messages: ChatMessageView[]
}

export type SidebarUser = {
  conversationId: string
  id: string
  name: string
  avatarUrl: string
  initials: string
  isOnline: boolean
  peer: ConversationPeer
}

export type SidebarTab = 'chats' | 'users'
