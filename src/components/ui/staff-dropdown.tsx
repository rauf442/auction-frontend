// frontend/src/components/ui/staff-dropdown.tsx
'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface StaffDropdownProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
}

export default function StaffDropdown({
  value,
  onChange,
  label = "Staff Member",
  placeholder = "Select staff member...",
  required = false,
  className = "",
  id
}: StaffDropdownProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Handle different response formats
        let usersList = []
        if (data.success && Array.isArray(data.data)) {
          usersList = data.data
        } else if (Array.isArray(data.users)) {
          usersList = data.users
        } else if (Array.isArray(data)) {
          usersList = data
        }
        setUsers(usersList)
      } else {
        console.error('Failed to load users:', response.statusText)
        setUsers([])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {Array.isArray(users) && users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.first_name} {user.last_name} ({user.email}) - {user.role}
          </option>
        ))}
      </select>
    </div>
  )
}
