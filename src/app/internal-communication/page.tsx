// frontend/src/app/internal-communication/page.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react'
import {
  CheckSquare,
  Plus,
  MessageCircle,
  X,
  MoreVertical,
  Users,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'

import type {
  User as UserType,
  Message,
  MessageRequest,
  TaskFormData,

  PaginatedResponse
} from '@/types/api'
import { realtimeChatService } from '@/lib/realtime-chat'
import FloatingChat from '@/components/FloatingChat'
import { UnifiedChat } from '@/components/realtime-chat'



type MessageFilter = 'all' | 'unread' | 'important' | 'files' | 'tasks';

export default function InternalCommunicationPage() {
  // Main state
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  
  // Data state
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  
  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    task_title: '',
    task_description: '',
    task_assigned_to: '',
    task_due_date: '',
    priority: 'normal',
    task_estimated_hours: undefined
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }

    loadInitialData()

    // Initialize realtime connection
    const initRealtime = async () => {
      try {
        await realtimeChatService.connect()
        console.log('✅ Connected to realtime chat service')
      } catch (error) {
        console.error('❌ Failed to connect to realtime chat service:', error)
      }
    }

    initRealtime()

    // Setup realtime event handlers
    realtimeChatService.onMessage((message) => {
      console.log('📨 Realtime message received:', message)
      // Add message to current conversation if it matches
      if (selectedUsers.length === 1 &&
          (message.sender_id === selectedUsers[0] || message.receiver_id === selectedUsers[0])) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === message.id)) return prev
          return [...prev, message].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
      }

      // Update unread count
      loadUnreadCount()
    })

    // POLLING FALLBACK: Check for new messages every 5 seconds
    // This will work until Supabase realtime is enabled
    const startPolling = () => {
      const pollInterval = setInterval(async () => {
        if (selectedUsers.length === 1) {
          try {
            const token = localStorage.getItem('token')
            if (!token) return

            const response = await fetch(`/api/internal-communication/messages?user_id=${selectedUsers[0]}`, {
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
                  console.log('📨 Polling found new messages:', trulyNewMessages.length)
                  return [...prev, ...trulyNewMessages].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  )
                }
                return prev
              })
            }
          } catch (error) {
            console.error('❌ Polling error:', error)
          }
        }
      }, 5000) // Poll every 5 seconds

      return pollInterval
    }

    const pollInterval = startPolling()

    realtimeChatService.onMessageUpdate((message) => {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? message : m)
      )
    })

    realtimeChatService.onMessageDelete((messageId) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    })

    // Cleanup function
    return () => {
      clearInterval(pollInterval)
      realtimeChatService.disconnect()
    }

    realtimeChatService.onTaskAssignment((task) => {
      // Refresh messages to show new task
      if (selectedUsers.includes(task.sender_id) || selectedUsers.includes(task.task_assigned_to || '')) {
        loadMessages()
      }
    })

    realtimeChatService.onTaskStatusChange((data) => {
      // Update task in messages
      setMessages(prev => 
        prev.map(m => m.id === data.messageId ? { ...m, task_status: data.newStatus } : m)
      )
    })
    
    return () => {
      realtimeChatService.disconnect()
    }
  }, [])

  useEffect(() => {
    if (selectedUsers.length > 0) {
      loadMessages()
    }
  }, [selectedUsers, messageFilter])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      console.error('No token found - redirecting to login')
      window.location.href = '/auth/login'
      return null
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      if (response.status === 401) {
        console.log('Auth failed - redirecting to login')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/auth/login'
        return null
      }

      return response
    } catch (error) {
      console.error('Request failed:', error)
      throw error
    }
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUsers(),
        loadUnreadCount()
      ])
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/internal-communication/users')
      
      if (response?.ok) {
        const data: { users: UserType[] } = await response.json()
        setUsers(data.users || [])
        console.log('✅ Loaded users:', data.users?.length || 0)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadMessages = async () => {
    if (selectedUsers.length === 0) return

    try {
      let url = '/api/internal-communication/messages?'
      const params = new URLSearchParams()

      if (selectedUsers.length === 1) {
        params.append('user_id', selectedUsers[0])
      }

      if (messageFilter !== 'all') {
        params.append('filter', messageFilter)
      }

      url += params.toString()

      const response = await makeAuthenticatedRequest(url)

      if (response?.ok) {
        const data: PaginatedResponse<Message> = await response.json()
        // Sort messages by created_at ascending (oldest first, like chat apps)
        const sortedMessages = (data.data || []).sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(sortedMessages)
        console.log('✅ Loaded messages:', sortedMessages.length)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/internal-communication/unread-count')
      
      if (response?.ok) {
        const data: { count: number } = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }





  const sendMessage = async (customMessageData?: MessageRequest) => {
    const messageData = customMessageData || {
        content: newMessage || 'File attachment',
        message_type: attachments.length > 0 ? 'file' : 'text',
        receiver_id: selectedUsers.length === 1 ? selectedUsers[0] : undefined,
        priority: 'normal',
        attachments: attachments.length > 0 ? attachments : undefined
      }

    if (loading || selectedUsers.length === 0) return
    if (!customMessageData && !newMessage.trim() && attachments.length === 0) return

    setLoading(true)
    try {

      const response = await makeAuthenticatedRequest('/api/internal-communication/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      if (response?.ok) {
        if (!customMessageData) {
        setNewMessage('')
        setAttachments([])
        messageInputRef.current?.focus()
        }
        await loadMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    if (!taskForm.task_title.trim() || !taskForm.task_assigned_to || loading) return

    setLoading(true)
    try {
      const messageData: MessageRequest = {
        content: taskForm.task_description || 'New task assigned',
        message_type: 'task',
        task_title: taskForm.task_title,
        task_description: taskForm.task_description,
        task_due_date: taskForm.task_due_date,
        task_assigned_to: taskForm.task_assigned_to,
        task_estimated_hours: taskForm.task_estimated_hours,
        priority: taskForm.priority,
        receiver_id: taskForm.task_assigned_to
      }

      const response = await makeAuthenticatedRequest('/api/internal-communication/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      if (response?.ok) {
        setShowTaskForm(false)
        setTaskForm({
          task_title: '',
          task_description: '',
          task_assigned_to: '',
          task_due_date: '',
          priority: 'normal',
          task_estimated_hours: undefined
        })
        await loadMessages()
      }
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }







  const getFilteredMessages = () => {
    let filtered = messages
    
    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.task_title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (messageFilter === 'unread') {
      filtered = filtered.filter(msg => !msg.read_at)
    } else if (messageFilter === 'important') {
      filtered = filtered.filter(msg => msg.priority === 'high' || msg.priority === 'urgent')
    } else if (messageFilter === 'files') {
      filtered = filtered.filter(msg => msg.message_type === 'file')
    } else if (messageFilter === 'tasks') {
      filtered = filtered.filter(msg => msg.message_type === 'task')
    }
    
    return filtered
  }

  const renderSidebar = () => (
    <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">Team Communication</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserSelector(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTaskForm(true)}
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Task
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2">
          {(['all', 'unread', 'important', 'files', 'tasks'] as MessageFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setMessageFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                messageFilter === filter
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Team Members List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Team Members
            </h3>
            <span className="text-xs text-gray-500">{users.length} online</span>
          </div>

          <div className="space-y-2">
            {users.map((user) => {
              const isSelected = selectedUsers.includes(user.auth_user_id) && selectedUsers.length === 1

              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUsers([user.auth_user_id])
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                      : 'hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white'
                    }`}>
                      {user.first_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate flex items-center">
                        <span className="capitalize">{user.role}</span>
                        <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )


  const renderMainContent = () => (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {selectedUsers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 max-w-sm">
                Choose a team member from the sidebar to start messaging or create a new task.
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <Button onClick={() => setShowUserSelector(true)} className="bg-blue-600 hover:bg-blue-700">
                <Users className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
              <Button onClick={() => setShowTaskForm(true)} variant="outline" className="border-green-200 text-green-600 hover:bg-green-50">
                <CheckSquare className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedUsers.length === 1 ? (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {users.find(u => u.auth_user_id === selectedUsers[0])?.first_name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {users.find(u => u.auth_user_id === selectedUsers[0])?.first_name}{' '}
                        {users.find(u => u.auth_user_id === selectedUsers[0])?.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center">
                        <span className="capitalize">{users.find(u => u.auth_user_id === selectedUsers[0])?.role}</span>
                        <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="ml-1">Online</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <h3 className="font-semibold text-gray-900">Group Chat</h3>
                    <p className="text-sm text-gray-500">{selectedUsers.length} members</p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskForm(true)}
                  className="border-green-200 text-green-600 hover:bg-green-50"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Assign Task
                </Button>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Unified Chat Component */}
          <UnifiedChat
            currentUser={currentUser}
            selectedUsers={selectedUsers}
            messages={getFilteredMessages()}
            onSendMessage={async (messageData: MessageRequest) => {
              await sendMessage(messageData)
            }}
            onSendTask={async (taskData: TaskFormData) => {
              // Create task message
              const taskMessage: MessageRequest = {
                content: `Task: ${taskData.task_title}`,
                message_type: 'task',
                receiver_id: selectedUsers[0],
                task_title: taskData.task_title,
                task_description: taskData.task_description,
                task_assigned_to: taskData.task_assigned_to,
                task_due_date: taskData.task_due_date,
                priority: taskData.priority
              }
              await sendMessage(taskMessage)
            }}
            showTaskCreation={true}
            className="flex-1"
          />
        </>
      )}
    </div>
  )

  return (
    <div className="layout-wrapper">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Chat Interface */}
        <main className="flex-1 bg-gray-50 overflow-hidden">
          <div className="h-full flex overflow-hidden">
            {/* Team Members Sidebar */}
            {renderSidebar()}

            {/* Chat Area */}
            {renderMainContent()}
          </div>
        </main>
      </div>

      {/* User Selector Modal */}
      {showUserSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Start New Conversation</h3>
                <p className="text-sm text-gray-500">Select team members to chat with</p>
              </div>
              <button
                onClick={() => setShowUserSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.auth_user_id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        setSelectedUsers(prev =>
                          isChecked
                            ? [...prev, user.auth_user_id]
                            : prev.filter(id => id !== user.auth_user_id)
                        )
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {user.first_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserSelector(false)
                  setSelectedUsers([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowUserSelector(false)
                }}
                disabled={selectedUsers.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
                <p className="text-sm text-gray-500">Assign a task to a team member</p>
              </div>
              <button
                onClick={() => setShowTaskForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.task_title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskForm.task_description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Task description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                <select
                  value={taskForm.task_assigned_to}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select team member</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.auth_user_id}>
                      {user.first_name} {user.last_name} - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as TaskFormData['priority'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={taskForm.task_estimated_hours || ''}
                    onChange={(e) => setTaskForm(prev => ({
                      ...prev,
                      task_estimated_hours: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Hours"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.task_due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, task_due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createTask}
                disabled={!taskForm.task_title.trim() || !taskForm.task_assigned_to || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Chat Widget */}
      <FloatingChat />
    </div>
  )
} 