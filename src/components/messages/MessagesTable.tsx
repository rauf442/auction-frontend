"use client"

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Message {
  id: number
  subject: string
  to: string
  created: string
  status: string
}

interface MessagesTableProps {
  messages: Message[]
}

type SortField = keyof Message
type SortDirection = 'asc' | 'desc'

export default function MessagesTable({ messages }: MessagesTableProps) {
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  const sortedMessages = [...messages].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>#</span>
                  <SortIcon field="id" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('subject')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Subject</span>
                  <SortIcon field="subject" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('to')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>To</span>
                  <SortIcon field="to" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Created</span>
                  <SortIcon field="created" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMessages.map((message) => (
              <tr key={message.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.id}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.subject}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.to}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.created}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {message.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found.</p>
          </div>
        )}
      </div>
    </div>
  )
} 