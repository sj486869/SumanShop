export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: "user" | "admin"
  content: string
  timestamp: number
  read: boolean
}

export interface Conversation {
  id: string
  userId: string
  userName: string
  userEmail: string
  lastMessage: string
  lastMessageTime: number
  unreadCount: number
  status: "active" | "closed"
}

const MESSAGES_KEY = "crime_zone_messages"
const CONVERSATIONS_KEY = "crime_zone_conversations"

export function getMessages(conversationId: string): Message[] {
  if (typeof window === "undefined") return []
  const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]")
  return messages.filter((m: Message) => m.conversationId === conversationId)
}

export function getAllMessages(): Message[] {
  if (typeof window === "undefined") return []
  return JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]")
}

export function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: "user" | "admin",
  content: string,
): Message {
  const messages = getAllMessages()
  const newMessage: Message = {
    id: Date.now().toString(),
    conversationId,
    senderId,
    senderName,
    senderRole,
    content,
    timestamp: Date.now(),
    read: senderRole === "admin",
  }
  messages.push(newMessage)
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))

  // Update conversation
  updateConversation(conversationId, content, senderRole === "user")

  return newMessage
}

export function markMessagesAsRead(conversationId: string, userId: string) {
  const messages = getAllMessages()
  const updated = messages.map((m: Message) => {
    if (m.conversationId === conversationId && m.senderId !== userId) {
      return { ...m, read: true }
    }
    return m
  })
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated))

  // Update conversation unread count
  const conversations = getConversations()
  const updatedConversations = conversations.map((c) => {
    if (c.id === conversationId) {
      return { ...c, unreadCount: 0 }
    }
    return c
  })
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updatedConversations))
}

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return []
  return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]")
}

export function getOrCreateConversation(userId: string, userName: string, userEmail: string): Conversation {
  const conversations = getConversations()
  let conversation = conversations.find((c) => c.userId === userId)

  if (!conversation) {
    conversation = {
      id: `conv_${userId}_${Date.now()}`,
      userId,
      userName,
      userEmail,
      lastMessage: "",
      lastMessageTime: Date.now(),
      unreadCount: 0,
      status: "active",
    }
    conversations.push(conversation)
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
  }

  return conversation
}

function updateConversation(conversationId: string, lastMessage: string, incrementUnread: boolean) {
  const conversations = getConversations()
  const updated = conversations.map((c) => {
    if (c.id === conversationId) {
      return {
        ...c,
        lastMessage,
        lastMessageTime: Date.now(),
        unreadCount: incrementUnread ? c.unreadCount + 1 : c.unreadCount,
      }
    }
    return c
  })
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated))
}

export function getUnreadCount(userId: string): number {
  const messages = getAllMessages()
  return messages.filter((m: Message) => m.senderId !== userId && !m.read).length
}

export function getTotalUnreadForAdmin(): number {
  const conversations = getConversations()
  return conversations.reduce((total, c) => total + c.unreadCount, 0)
}
