"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Send, User } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { AdminGuard } from "@/components/admin-guard"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  type Conversation,
  type Message,
} from "@/lib/chat"
import { cn } from "@/lib/utils"

export default function AdminChatPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [user] = useState(() => getCurrentUser())

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/")
      return
    }

    loadConversations()

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      loadConversations()
      if (selectedConversation) {
        setMessages(getMessages(selectedConversation.id))
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [user, router, selectedConversation])

  const loadConversations = () => {
    const convs = getConversations()
    setConversations(convs.sort((a, b) => b.lastMessageTime - a.lastMessageTime))
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    const msgs = getMessages(conversation.id)
    setMessages(msgs)
    markMessagesAsRead(conversation.id, "admin")
    loadConversations()
  }

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    sendMessage(selectedConversation.id, user.id, "Admin", "admin", newMessage)
    setMessages(getMessages(selectedConversation.id))
    setNewMessage("")
    loadConversations()
  }

  return (
    <AdminGuard>
      <div className="min-h-screen">
        <AdminHeader />
        <div className="container py-8">
          <AdminNav />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Conversations List */}
            <Card className="lg:col-span-1 p-4">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversations
              </h2>
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        selectedConversation?.id === conv.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted border-transparent",
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-sm">{conv.userName}</span>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "No messages yet"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conv.lastMessageTime).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </Card>

            {/* Chat Window */}
            <Card className="lg:col-span-2 flex flex-col h-[600px]">
              {selectedConversation ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">{selectedConversation.userName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedConversation.userEmail}</p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn("flex", message.senderRole === "admin" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3",
                            message.senderRole === "admin"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <p className="text-sm font-medium mb-1">{message.senderName}</p>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1"
                      />
                      <Button onClick={handleSend} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
