"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  type Message,
} from "@/lib/chat"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [conversationId, setConversationId] = useState<string>("")
  const [user, setUser] = useState(() => getCurrentUser())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)

    if (!currentUser) return

    const conversation = getOrCreateConversation(currentUser.id, currentUser.name, currentUser.email)
    setConversationId(conversation.id)
    setMessages(getMessages(conversation.id))
    setUnreadCount(getUnreadCount(currentUser.id))

    // Poll for new messages every 2 seconds
    const interval = setInterval(() => {
      const updatedMessages = getMessages(conversation.id)
      setMessages(updatedMessages)
      setUnreadCount(getUnreadCount(currentUser.id))
    }, 2000)

    return () => clearInterval(interval)
  }, []) // Empty dependency array - only run once on mount

  useEffect(() => {
    if (isOpen && user && conversationId) {
      markMessagesAsRead(conversationId, user.id)
      setUnreadCount(0)
    }
  }, [isOpen, user, conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!user) return null

  const handleSend = () => {
    if (!newMessage.trim() || !conversationId) return

    sendMessage(conversationId, user.id, user.name, "user", newMessage)
    setMessages(getMessages(conversationId))
    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </>
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Customer Support</h3>
            <p className="text-sm text-muted-foreground">We typically reply within minutes</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Start a conversation with our team</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex", message.senderRole === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.senderRole === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
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
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
