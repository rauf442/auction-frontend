// frontend/src/components/FloatingChat.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Maximize2,
  Users,
  Bell,
  Dot,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { realtimeChatService, type ChatNotification, type TypingUser, type UserStatus } from '@/lib/realtime-chat'
import type { Message, User as UserType, MessageRequest, TaskFormData } from '@/types/api'
import { UnifiedChat } from '@/components/realtime-chat'

interface FloatingChatProps {
  className?: string;
}

interface QuickConversation {
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  status: 'online' | 'offline';
}

export default function FloatingChat({ className = '' }: FloatingChatProps) {
  // State management
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<ChatNotification[]>([])
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications'>('chat')
  const [conversations, setConversations] = useState<QuickConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map())
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial conversations
  const loadInitialConversations = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/internal-communication/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Transform conversations data to match our QuickConversation format
        const transformedConversations: QuickConversation[] = (data.conversations || []).map((conv: any) => ({
          userId: conv.conversation_with_user_id,
          userName: `${conv.conversation_with_first_name || ''} ${conv.conversation_with_last_name || ''}`.trim() || 'Unknown',
          lastMessage: conv.last_message_content || '',
          lastMessageTime: conv.last_message_created_at ? new Date(conv.last_message_created_at) : undefined,
          unreadCount: conv.unread_count || 0,
          status: 'offline' as const // Default to offline, will be updated by realtime events
        }))

        setConversations(transformedConversations)
        console.log('✅ Loaded initial conversations:', transformedConversations.length)
      }
    } catch (error) {
      console.error('Error loading initial conversations:', error)
    }
  }

  // Initialize realtime connection
  useEffect(() => {
    const initRealtime = async () => {
      try {
        await realtimeChatService.connect()
        setIsConnected(true)
        // Load initial conversations after connecting
        await loadInitialConversations()
      } catch (error) {
        console.error('Failed to connect to realtime chat:', error)
        setIsConnected(false)
      }
    }

    initRealtime()

    // Setup event handlers
    realtimeChatService.onConnectionStatusChange((connected) => {
      setIsConnected(connected)
    })

    realtimeChatService.onMessage((message) => {
      console.log('📨 FloatingChat realtime message:', message)
      // Add to messages if it's for the current conversation
      if (selectedConversation &&
          (message.sender_id === selectedConversation || message.receiver_id === selectedConversation)) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === message.id)) return prev
          return [...prev, message].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
      }
      
      // Update conversation list
      updateConversationFromMessage(message)
      
      // Show notification popup if chat is not open or minimized
      if (!isOpen || isMinimized) {
        showNotificationPopup(message)
      }
    })

    realtimeChatService.onNotificationReceived((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50
      
      // Auto-open chat for urgent notifications
      if (notification.type === 'task') {
        setIsOpen(true)
        setActiveTab('notifications')
      }
    })

    realtimeChatService.onTyping((typingUser) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== typingUser.userId)
        return typingUser.isTyping ? [...filtered, typingUser] : filtered
      })
    })

    realtimeChatService.onUserStatusChange((userStatus) => {
      setUserStatuses(prev => new Map(prev.set(userStatus.userId, userStatus)))
    })

    // POLLING FALLBACK: Check for new messages every 3 seconds
    const pollInterval = setInterval(async () => {
      if (selectedConversation) {
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch(`/api/internal-communication/messages?user_id=${selectedConversation}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            const newMessages = data.messages || []

            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const trulyNewMessages = newMessages.filter((m: Message) => !existingIds.has(m.id))

              if (trulyNewMessages.length > 0) {
                console.log('📨 FloatingChat polling found new messages:', trulyNewMessages.length)
                const updatedMessages = [...prev, ...trulyNewMessages].sort((a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
                // Keep only last 50 messages to avoid memory issues
                return updatedMessages.slice(-50)
              }
              return prev
            })
          }
        } catch (error) {
          console.error('❌ FloatingChat polling error:', error)
        }
      }
    }, 3000) // Poll every 3 seconds

    return () => {
      clearInterval(pollInterval)
      realtimeChatService.disconnect()
    }
  }, [selectedConversation, isOpen, isMinimized])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update conversation from message
  const updateConversationFromMessage = (message: Message) => {
    const currentUser = realtimeChatService.user
    if (!currentUser) return

    const otherUserId = message.sender_id === currentUser.auth_user_id 
      ? message.receiver_id 
      : message.sender_id
    
    if (!otherUserId) return

    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.userId === otherUserId)
      const conversation: QuickConversation = {
        userId: otherUserId,
        userName: message.sender_id === currentUser.auth_user_id 
          ? message.receiver_name || 'Unknown'
          : message.sender_name || 'Unknown',
        lastMessage: message.content,
        lastMessageTime: new Date(message.created_at),
        unreadCount: message.sender_id !== currentUser.auth_user_id ? 1 : 0,
        status: userStatuses.get(otherUserId)?.status || 'offline'
      }

      if (existingIndex >= 0) {
        const updated = [...prev]
        const existing = updated[existingIndex]
        updated[existingIndex] = {
          ...conversation,
          unreadCount: existing.unreadCount + (message.sender_id !== currentUser.auth_user_id ? 1 : 0)
        }
        return updated.sort((a, b) => (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0))
      } else {
        return [conversation, ...prev].slice(0, 10) // Keep last 10 conversations
      }
    })

    // Update total unread count
    setUnreadCount(prev => prev + (message.sender_id !== currentUser.auth_user_id ? 1 : 0))
  }

  // Show notification popup
  const showNotificationPopup = (message: Message) => {
    // Clear existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }

    // Create browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        message.message_type === 'task' ? 'New Task' : 'New Message',
        {
          body: message.message_type === 'task' ? message.task_title : message.content,
          icon: '/icons/message-circle.svg',
          tag: 'msaber-chat'
        }
      )
    }

    // Auto-dismiss after 5 seconds
    notificationTimeoutRef.current = setTimeout(() => {
      // Auto-hide logic can go here
    }, 5000)
  }

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/internal-communication/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          message_type: 'text',
          receiver_id: selectedConversation,
          priority: 'normal'
        })
      })

      if (response.ok) {
        setNewMessage('')
        realtimeChatService.stopTyping(selectedConversation)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Handle typing
  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (selectedConversation) {
      if (value.trim()) {
        realtimeChatService.startTyping(selectedConversation)
      } else {
        realtimeChatService.stopTyping(selectedConversation)
      }
    }
  }

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString()
  }

  // Render chat button
  const renderChatButton = () => (
    <Button
      onClick={() => {
        setIsOpen(true)
        requestNotificationPermission()
      }}
      className={`fixed bottom-1 right-1 w9 h-9 rounded-full shadow-lg z-40 ${
        isConnected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
      } ${className}`}
      size="sm"
    >
      <MessageCircle className="w-3 h-3 text-white" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 min-w-[20px] h-4 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      {!isConnected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
      )}
    </Button>
  )

  // Render floating chat window
  const renderChatWindow = () => (
    <Card className={`fixed bottom-24 right-6 w-96 h-[500px] shadow-xl z-50 border-2 ${
      isMinimized ? 'h-12' : ''
    } transition-all duration-200`}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">
            {selectedConversation ? 'Chat' : 'Quick Chat'}
          </span>
          {!isConnected && (
            <Badge variant="secondary" className="text-xs bg-red-500">
              Offline
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/20 w-6 h-6 p-0"
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 w-6 h-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 h-[452px] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'chat' 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Conversations
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'notifications' 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              Notifications
              {notifications.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">
                  {notifications.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <div className="h-full flex flex-col">
                {!selectedConversation ? (
                  /* Conversation List */
                  <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        <div className="text-center">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No recent conversations</p>
                          <p className="text-xs mt-1">Start a chat from the main page</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {conversations.map((conv) => (
                          <button
                            key={conv.userId}
                            onClick={() => setSelectedConversation(conv.userId)}
                            className="w-full p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    {conv.userName[0]?.toUpperCase()}
                                  </div>
                                  <Dot className={`w-3 h-3 absolute -bottom-1 -right-1 rounded-full ${
                                    conv.status === 'online' ? 'text-green-500' : 'text-gray-400'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">
                                    {conv.userName}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {conv.lastMessage || 'No messages yet'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {conv.lastMessageTime && (
                                  <p className="text-xs text-gray-400">
                                    {formatTime(conv.lastMessageTime)}
                                  </p>
                                )}
                                {conv.unreadCount > 0 && (
                                  <Badge className="bg-blue-500 text-white text-xs mt-1">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Chat View */
                  <div className="h-full flex flex-col">
                    {/* Chat Header */}
                    <div className="p-3 border-b flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConversation(null)}
                          className="w-6 h-6 p-0"
                        >
                          ←
                        </Button>
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {conversations.find(c => c.userId === selectedConversation)?.userName[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">
                          {conversations.find(c => c.userId === selectedConversation)?.userName}
                        </span>
                      </div>
                    </div>

                    {/* Unified Chat Component */}
                    <UnifiedChat
                      currentUser={realtimeChatService.user}
                      selectedUsers={selectedConversation ? [selectedConversation] : []}
                      messages={messages}
                      onSendMessage={async (messageData: MessageRequest) => {
                        await sendMessage()
                      }}
                      onSendTask={async (taskData: TaskFormData) => {
                        // Create task message
                        const taskMessage: MessageRequest = {
                          content: `Task: ${taskData.task_title}`,
                          message_type: 'task',
                          receiver_id: selectedConversation!,
                          task_title: taskData.task_title,
                          task_description: taskData.task_description,
                          task_assigned_to: taskData.task_assigned_to,
                          task_due_date: taskData.task_due_date,
                          priority: taskData.priority
                        }
                        await sendMessage()
                      }}
                      showTaskCreation={true}
                      compactMode={true}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Notifications */
              <div className="h-full overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    <div className="text-center">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No notifications</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            notif.type === 'task' ? 'bg-green-100 text-green-600' :
                            notif.type === 'message' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {notif.type === 'task' ? <CheckCircle2 className="w-4 h-4" /> :
                             notif.type === 'message' ? <MessageCircle className="w-4 h-4" /> :
                             <Bell className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">
                              {notif.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notif.message}
                            </p>
                            {notif.sender && (
                              <p className="text-xs text-gray-500 mt-1">
                                From: {notif.sender.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(notif.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )

  return (
    <>
      {/* Chat Button - Always visible */}
      {!isOpen && renderChatButton()}
      
      {/* Chat Window - Show when open */}
      {isOpen && renderChatWindow()}
    </>
  )
}
