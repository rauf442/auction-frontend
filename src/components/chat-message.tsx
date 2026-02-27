import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'
import type { Message } from '@/types/api'
import { CheckSquare, AlertCircle, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ChatMessageItemProps {
  message: ChatMessage | Message
  isOwnMessage: boolean
  showHeader: boolean
}

export const ChatMessageItem = ({ message, isOwnMessage, showHeader }: ChatMessageItemProps) => {
  // Handle both ChatMessage (Supabase UI) and Message (our custom type)
  const isSupabaseMessage = 'user' in message
  const content = isSupabaseMessage ? message.content : message.content || ''
  const userName = isSupabaseMessage ? message.user.name : message.sender_name || 'Unknown'
  const createdAt = isSupabaseMessage ? message.createdAt : message.created_at || new Date().toISOString()
  const messageType = 'message_type' in message ? message.message_type : 'text'

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓'
      case 'in_progress': return '⟳'
      case 'pending': return '⏳'
      default: return '•'
    }
  }

  return (
    <div className={`flex mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={cn('max-w-[75%] w-fit flex flex-col gap-1', {
          'items-end': isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn('flex items-center gap-2 text-xs px-3', {
              'justify-end flex-row-reverse': isOwnMessage,
            })}
          >
            <span className={'font-medium'}>{userName}</span>
            <span className="text-foreground/50 text-xs">
              {formatTime(createdAt)}
            </span>
          </div>
        )}

        {/* Task message */}
        {messageType === 'task' && (
          <div className={cn(
            'py-3 px-4 rounded-xl text-sm w-fit border',
            isOwnMessage ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-muted'
          )}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-2">
                <CheckSquare className="w-4 h-4" />
                <span className="font-medium text-xs uppercase tracking-wide">TASK</span>
                <Badge className={`text-xs ${getPriorityColor(('priority' in message ? message.priority : 'normal') || 'normal')} border-0`}>
                  {('priority' in message ? message.priority : 'normal') || 'normal'}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  {('task_title' in message ? message.task_title : 'Task') || 'Task'}
                </h4>
                {('task_description' in message ? message.task_description : '') && (
                  <p className="text-sm opacity-90">
                    {('task_description' in message ? message.task_description : '')}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs ${getTaskStatusColor(('task_status' in message ? message.task_status : 'pending') || 'pending')} border-0`}>
                    {getTaskStatusIcon(('task_status' in message ? message.task_status : 'pending') || 'pending')}
                    <span className="ml-1 capitalize">
                      {('task_status' in message ? message.task_status : 'pending')?.replace('_', ' ') || 'pending'}
                    </span>
                  </Badge>
                </div>
              </div>

              {(('task_due_date' in message && message.task_due_date) || ('task_estimated_hours' in message && message.task_estimated_hours)) && (
                <div className="flex items-center space-x-4 text-xs opacity-75 pt-2 border-t border-opacity-20 border-gray-300">
                  {('task_due_date' in message && message.task_due_date) && (
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Due: {new Date(message.task_due_date).toLocaleDateString()}
                    </div>
                  )}
                  {('task_estimated_hours' in message && message.task_estimated_hours) && (
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {message.task_estimated_hours}h estimated
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regular message */}
        {messageType !== 'task' && (
          <div
            className={cn(
              'py-2 px-3 rounded-xl text-sm w-fit',
              isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            )}
          >
            {content}
          </div>
        )}
      </div>
    </div>
  )
}
