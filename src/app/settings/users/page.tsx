"use client"

import React, { useState, useEffect } from 'react'
import { Plus, ChevronDown, Loader2, Edit, Trash2, X } from 'lucide-react'
import UsersAPI, { User } from '@/lib/users-api'
import { useBrand } from '@/lib/brand-context'

// User form modal component
interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (user: User) => void
  user?: User | null
  mode: 'add' | 'edit'
}

function UserModal({ isOpen, onClose, onSave, user, mode }: UserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    position: '',
    is_active: true,
    two_factor_enabled: false
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'user', label: 'User' }
  ]

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user',
        position: user.position || '',
        is_active: user.is_active ?? true,
        two_factor_enabled: user.two_factor_enabled ?? false
      })
    } else {
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        position: '',
        is_active: true,
        two_factor_enabled: false
      })
    }
    setError(null)
  }, [user, mode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!formData.email || !formData.first_name || !formData.last_name) {
        setError('Email, first name, and last name are required')
        return
      }

      // Enforce allowed roles client-side too
      if (!['admin', 'accountant', 'user'].includes(formData.role)) {
        setError('Invalid role. Allowed roles: Admin, Accountant, User')
        return
      }

      let response
      if (mode === 'add') {
        response = await UsersAPI.createUser(formData)
      } else if (user) {
        response = await UsersAPI.updateUser(user.id, formData)
      }

      if (response?.success && response.data) {
        onSave(response.data)
        onClose()
      } else {
        setError(response?.error || 'Failed to save user')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {mode === 'add' ? 'Add New User' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={mode === 'edit'}
            />
            {mode === 'edit' && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Art Director, Assistant, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                User is active
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="two_factor_enabled"
                checked={formData.two_factor_enabled}
                onChange={(e) => setFormData({ ...formData, two_factor_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="two_factor_enabled" className="ml-2 block text-sm text-gray-700">
                Enable two-factor authentication
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center space-x-2"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{saving ? 'Saving...' : (mode === 'add' ? 'Add User' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete confirmation modal
interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  user: User | null
  deleting: boolean
}

function DeleteModal({ isOpen, onClose, onConfirm, user, deleting }: DeleteModalProps) {
  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-red-600">Delete User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={deleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-700 mb-6">
          Are you sure you want to delete <strong>{user.first_name} {user.last_name}</strong>?
          This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center space-x-2"
            disabled={deleting}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{deleting ? 'Deleting...' : 'Delete User'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const { brand } = useBrand()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Available roles for the role filter and assignment
  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'user', label: 'User' }
  ]

  useEffect(() => {
    fetchUsers()
  }, [brand])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // Fetch users filtered by active brand for non-super-admins (server enforces membership)
      // We need brand_id; fetch via brands API by code
      let brandId: number | undefined
      if (brand) {
        try {
          const resp = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + `/api/brands/by-code/${brand}`)
          const j = await resp.json()
          brandId = j?.data?.id
        } catch { }
      }
      const response = await UsersAPI.getUsers(brandId ? { brand_id: brandId } : undefined)
      if (response.success) {
        setUsers(response.data)
      } else {
        setError(response.error || 'Failed to fetch users')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await UsersAPI.updateUserRole(userId, newRole)
      if (response.success) {
        // Update the user in the local state
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ))
      } else {
        alert('Failed to update user role: ' + (response.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Failed to update user role: ' + err.message)
    }
  }

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const response = await UsersAPI.updateUser(userId, { is_active: !isActive })
      if (response.success) {
        // Update the user in the local state
        setUsers(users.map(user =>
          user.id === userId ? { ...user, is_active: !isActive } : user
        ))
      } else {
        alert('Failed to update user status: ' + (response.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Failed to update user status: ' + err.message)
    }
  }

  const handleUserSaved = (savedUser: User) => {
    if (showAddModal) {
      // Add new user to the list
      setUsers([savedUser, ...users])
    } else if (showEditModal) {
      // Update existing user in the list
      setUsers(users.map(user => user.id === savedUser.id ? savedUser : user))
    }
    setShowAddModal(false)
    setShowEditModal(false)
    setSelectedUser(null)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setDeleting(true)
      const response = await UsersAPI.deleteUser(selectedUser.id)
      if (response.success) {
        // Remove user from the list
        setUsers(users.filter(user => user.id !== selectedUser.id))
        setShowDeleteModal(false)
        setSelectedUser(null)
      } else {
        alert('Failed to delete user: ' + (response.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Add this mapping for role priority
  const rolePriority: Record<string, number> = {
    super_admin: 1,
    admin: 2,
    user: 3,
    accountant: 4
  }

  const filteredUsers = users.filter(user => {
    if (selectedRole === 'all') return true
    return user.role.includes(selectedRole)
  })

  // Apply sorting to filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const pa = rolePriority[a.role] ?? 99;
    const pb = rolePriority[b.role] ?? 99;

    if (pa !== pb) {
      return pa - pb; // sort by role priority first
    }

    // tie-breaker: sort by id ascending
    return a.id - b.id;
  });

  const formatLastActivity = (lastActivity: string | null | undefined) => {
    if (!lastActivity) return ''
    const date = new Date(lastActivity)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage user accounts and permissions ({users.length} total users)
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filter Controls */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">
              Filter by role:
            </label>
            <select
              id="role-filter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles ({users.length})</option>
              {roles.map(role => {
                const count = users.filter(user => user.role.includes(role.value)).length
                return (
                  <option key={role.value} value={role.value}>
                    {role.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  2FA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.position || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={user.role === 'super_admin'}
                    >
                      {/* Show current role even if it's super_admin, but disallow change */}
                      {user.role === 'super_admin' ? (
                        <option value="super_admin">Super Admin</option>
                      ) : (
                        roles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))
                      )}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.two_factor_enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastActivity(user.last_activity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                    >
                      {user.is_active ? 'Active' : 'Suspended'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedUsers.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No users found matching the selected criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleUserSaved}
        mode="add"
      />

      <UserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleUserSaved}
        user={selectedUser}
        mode="edit"
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteUser}
        user={selectedUser}
        deleting={deleting}
      />
    </div>
  )
} 