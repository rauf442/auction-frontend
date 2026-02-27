"use client"

import React, { useState, useEffect } from 'react'
import { User, Lock, Mail, Calendar, Shield, Key } from 'lucide-react'

interface CurrentUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  position?: string
  is_active: boolean
  two_factor_enabled: boolean
  last_activity?: string
  created_at?: string
}

export default function AccountPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get current user ID from localStorage
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          if (user?.id) {
            // Fetch fresh user data from API
            const response = await fetch(`/api/users/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.data) {
                setCurrentUser(data.data)
              } else {
                // Fallback to localStorage if API fails
                setCurrentUser(user)
              }
            } else {
              // Fallback to localStorage if API fails
              setCurrentUser(user)
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        // Fallback to localStorage
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            setCurrentUser(JSON.parse(userStr))
          } catch (fallbackError) {
            console.error('Error parsing fallback user data:', fallbackError)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    // Validation
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required')
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long')
      setPasswordLoading(false)
      return
    }

    try {
      // Call password change API (this would need to be implemented in the backend)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newPassword: passwordForm.newPassword
        })
      })

      if (response.ok) {
        setPasswordSuccess(true)
        setPasswordForm({
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswordForm(false)
        setTimeout(() => setPasswordSuccess(false), 3000)
      } else {
        const errorData = await response.json()
        setPasswordError(errorData.error || 'Failed to change password')
      }
    } catch (error: any) {
      setPasswordError('Failed to change password. Please try again.')
      console.error('Password change error:', error)
    } finally {
      setPasswordLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-red-100 text-red-800',
      developer: 'bg-purple-100 text-purple-800',
      owner: 'bg-yellow-100 text-yellow-800',
      specialist: 'bg-blue-100 text-blue-800',
      editor: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
      guest: 'bg-orange-100 text-orange-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Not Found</h1>
          <p className="text-gray-600">Please log in again to access your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Success Message */}
        {passwordSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            Password changed successfully!
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-semibold">
                  {currentUser.first_name?.charAt(0)}{currentUser.last_name?.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentUser.first_name} {currentUser.last_name}
                </h2>
                <p className="text-gray-600">{currentUser.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)}
                  </span>
                  {currentUser.position && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {currentUser.position}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Account Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Role</p>
                    <p className="text-sm text-gray-900">{currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Member Since</p>
                    <p className="text-sm text-gray-900">{formatDate(currentUser.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Account Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {currentUser.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentUser.two_factor_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {currentUser.two_factor_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Activity</p>
                    <p className="text-sm text-gray-900">{formatDate(currentUser.last_activity)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Security Settings
            </h3>

            <div className="space-y-4">
              {/* Change Password Section */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Change Password
                </button>
              </div>

              {/* Password Change Form */}
              {showPasswordForm && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
                  
                  {passwordError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        minLength={8}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false)
                          setPasswordForm({ newPassword: '', confirmPassword: '' })
                          setPasswordError(null)
                        }}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={passwordLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">
                      {currentUser.two_factor_enabled ? 'Enabled - Your account is protected' : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                  {currentUser.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help with your account?{' '}
            <a href="mailto:support@msaber.com" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 