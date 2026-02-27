'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
  type ChatMessage,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Plus, Paperclip } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import type { Message, MessageRequest, TaskFormData } from '@/types/api'
import { Badge } from '@/components/ui/badge'

interface UnifiedChatProps {
  // Supabase UI props (for compatibility)
  roomName?: string
  username?: string
  onMessage?: (messages: ChatMessage[]) => void
  supabaseMessages?: ChatMessage[]

  // Our custom props
  conversationId?: string
  currentUser?: any
  selectedUsers?: string[]
  onSendMessage?: (messageData: MessageRequest) => void
  onSendTask?: (taskData: TaskFormData) => void
  messages?: Message[]
  className?: string
  showTaskCreation?: boolean
  compactMode?: boolean
}

/**
 * Unified Chat Component
 * Supports both Supabase UI realtime chat and our custom message system
 * Can be reused in both main internal communication page and floating chat
 */
export const UnifiedChat = ({
  // Supabase UI props
  roomName,
  username,
  onMessage,
  supabaseMessages = [],

  // Our custom props
  conversationId,
  currentUser,
  selectedUsers = [],
  onSendMessage,
  onSendTask,
  messages: customMessages = [],
  className = '',
  showTaskCreation = true,
  compactMode = false,
}: UnifiedChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()
  const [newMessage, setNewMessage] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    task_title: '',
    task_description: '',
    task_assigned_to: '',
    task_due_date: '',
    priority: 'normal',
    task_estimated_hours: undefined
  })

  // Supabase realtime (always call the hook, but conditionally use it)
  const supabaseRealtime = useRealtimeChat({
    roomName: roomName || 'default-room',
    username: username || 'unknown-user',
  })

  // Determine which message system to use
  const useSupabaseRealtime = !!roomName && !!username

  // Type guard to check if message is our custom Message type
  const isCustomMessage = (message: ChatMessage | Message): message is Message => {
    return 'sender_id' in message && 'created_at' in message
  }

  const allMessages = useMemo(() => {
    if (useSupabaseRealtime) {
      // Use Supabase UI messages
      const mergedMessages = [...supabaseMessages, ...(supabaseRealtime?.messages || [])]
      const uniqueMessages = mergedMessages.filter(
        (message, index, self) => index === self.findIndex((m) => m.id === message.id)
      )
      return uniqueMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    } else {
      // Use our custom messages
      return customMessages.sort((a, b) =>
        new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
      )
    }
  }, [useSupabaseRealtime, supabaseMessages, supabaseRealtime?.messages, customMessages])

  useEffect(() => {
    if (onMessage && useSupabaseRealtime) {
      onMessage(allMessages as ChatMessage[])
    }
  }, [allMessages, onMessage, useSupabaseRealtime])

  useEffect(() => {
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newMessage.trim()) return

      if (useSupabaseRealtime && supabaseRealtime?.sendMessage) {
        // Use Supabase realtime
        await supabaseRealtime.sendMessage(newMessage)
      } else if (onSendMessage && selectedUsers.length > 0) {
        // Use our custom API
        const messageData: MessageRequest = {
          content: newMessage,
          message_type: 'text',
          receiver_id: selectedUsers[0],
          priority: 'normal'
        }
        await onSendMessage(messageData)
      }

      setNewMessage('')
    },
    [newMessage, useSupabaseRealtime, supabaseRealtime, onSendMessage, selectedUsers]
  )

  const handleSendTask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!taskFormData.task_title.trim() || !taskFormData.task_assigned_to) return

      if (onSendTask && selectedUsers.length > 0) {
        const taskData: TaskFormData = {
          ...taskFormData,
          task_assigned_to: selectedUsers[0]
        }
        await onSendTask(taskData)
      }

      setTaskFormData({
        task_title: '',
        task_description: '',
        task_assigned_to: '',
        task_due_date: '',
        priority: 'normal',
        task_estimated_hours: undefined
      })
      setShowTaskForm(false)
    },
    [taskFormData, onSendTask, selectedUsers]
  )

  const getCurrentUsername = () => {
    if (username) return username
    if (currentUser) return currentUser.first_name + ' ' + currentUser.last_name
    return 'Unknown'
  }

  const isConnected = useSupabaseRealtime ? supabaseRealtime?.isConnected : true

  return (
    <div className={cn("flex flex-col h-full w-full bg-background text-foreground antialiased", className)}>
      {/* Messages */}
      <div ref={containerRef} className={cn("flex-1 overflow-y-auto", compactMode ? "p-2 space-y-2" : "p-4 space-y-4")}>
        {allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : null}
        <div className="space-y-1">
          {allMessages.map((message, index) => {
            const prevMessage = index > 0 ? allMessages[index - 1] : null

            // Determine if this is the current user's message
            let isOwnMessage = false
            let userName = 'Unknown'

            if (useSupabaseRealtime && 'user' in message) {
              // Supabase UI message
              isOwnMessage = message.user.name === getCurrentUsername()
              userName = message.user.name
            } else if (isCustomMessage(message)) {
              // Our custom message
              isOwnMessage = message.sender_id === currentUser?.auth_user_id ||
                           message.sender_id === currentUser?.id?.toString()
              userName = message.sender_name || 'Unknown'
            }

            const showHeader = !prevMessage ||
              (useSupabaseRealtime && 'user' in prevMessage && 'user' in message && prevMessage.user.name !== message.user.name) ||
              (!useSupabaseRealtime && isCustomMessage(prevMessage) && isCustomMessage(message) && prevMessage.sender_name !== message.sender_name)

            return (
              <div
                key={message.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <ChatMessageItem
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showHeader={showHeader}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Task Creation Form */}
      {showTaskForm && showTaskCreation && (
        <div className="border-t border-border p-4 bg-muted/50">
          <form onSubmit={handleSendTask} className="space-y-3">
            <div>
              <Input
                placeholder="Task title..."
                value={taskFormData.task_title}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, task_title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Input
                placeholder="Task description (optional)..."
                value={taskFormData.task_description}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, task_description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 text-sm border border-input bg-background rounded-md"
                value={taskFormData.priority}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
              </select>
              <Input
                type="date"
                placeholder="Due date (optional)..."
                value={taskFormData.task_due_date}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, task_due_date: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Create Task
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTaskForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className={cn("flex w-full gap-2 border-t border-border", compactMode ? "p-2" : "p-4")}>
        <div className="flex-1 flex gap-2">
          <Input
            className={cn(
              'bg-background text-sm transition-all duration-300',
              isConnected && newMessage.trim() ? 'rounded-l-full' : 'rounded-full'
            )}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
          />

          {/* Task Creation Button */}
          {showTaskCreation && selectedUsers.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => setShowTaskForm(!showTaskForm)}
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>

        {isConnected && newMessage.trim() && (
          <Button
            className="aspect-square rounded-full animate-in fade-in slide-in-from-right-4 duration-300 shrink-0"
            type="submit"
            disabled={!isConnected}
          >
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </div>
  )
}
