"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Bell, User, Mail, ChevronDown, Plus, UserPlus, FileText, Package, Gavel, HelpCircle, Search, Eye, Upload } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { hasAdminAccess, getCurrentUserRole } from '@/lib/auth-utils'

interface CurrentUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
}

export default function Header() {
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const router = useRouter()
  const { brand, setBrand, details } = useBrand()
  const [brands, setBrands] = useState<{ code: string; name: string }[]>([])
  const userRole = getCurrentUserRole()

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])
useEffect(() => {
  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowCreateDropdown(false)
      setShowAccountDropdown(false)
    }
  }

  document.addEventListener('keydown', handleEsc)

  return () => {
    document.removeEventListener('keydown', handleEsc)
  }
}, [])
  const handleSignOut = async () => {
    try {
      await apiClient.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '. ')

  const createMenuItems = [
    { label: 'Client', href: '/clients/new', icon: UserPlus },
    { label: 'Consignment Agreement', href: '/consignments/new', icon: FileText },
    { label: 'Item', href: '/items/new', icon: Package },
    { label: 'Auction', href: '/auctions/new', icon: Gavel },
  ]

  const getUserDisplayName = () => {
    if (!currentUser) return 'Loading...'
    if (currentUser.first_name && currentUser.last_name) {
      return `${currentUser.first_name} ${currentUser.last_name}`
    }
    return currentUser.email
  }

  const getUserRole = () => {
    const role = userRole || 'user'
    const spaced = role.replace(/_/g, ' ')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 relative z-50">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo + Brand */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">{details.name}</h1>


        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* System Message */}
          <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600 mr-6">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>


          {/* Create dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline text-sm font-medium">Create</span>
              <ChevronDown className="h-4 w-4" />
            </button>

{showCreateDropdown && (
  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
    
    {/* Header with Close */}
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
      <span className="text-sm font-medium text-gray-700">Create</span>
      <button
        onClick={() => setShowCreateDropdown(false)}
        className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
      >
        ✕
      </button>
    </div>

    {createMenuItems.map((item) => {
      const IconComponent = item.icon
      return (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setShowCreateDropdown(false)}
        >
          <IconComponent className="h-4 w-4 text-gray-400" />
          <span>{item.label}</span>
        </Link>
      )
    })}
  </div>
)}
          </div>

          {/* Account dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{getUserDisplayName()}</span>
                <span className="text-xs text-gray-500">{getUserRole()}</span>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                {currentUser?.first_name ? (
                  <span className="text-white text-sm font-semibold">
                    {currentUser.first_name.charAt(0)}{currentUser.last_name?.charAt(0) || ''}
                  </span>
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showAccountDropdown && (
  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">

    {/* Header with Close */}
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
      <span className="text-sm font-medium text-gray-700">Account</span>
      <button
        onClick={() => setShowAccountDropdown(false)}
        className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
      >
        ✕
      </button>
    </div>

    {currentUser && (
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900">{getUserDisplayName()}</div>
        <div className="text-sm text-gray-500">{currentUser.email}</div>
      </div>
    )}
                <Link
                  href="/account"
                  className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowAccountDropdown(false)}
                >
                  <User className="h-4 w-4 text-gray-400" />
                  <span>My Account</span>
                </Link>
                {hasAdminAccess() && (
                  <Link
                    href="/settings"
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowAccountDropdown(false)}
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <span>Settings</span>
                  </Link>
                )}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => {
                      setShowAccountDropdown(false)
                      handleSignOut()
                    }}
                  >
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showCreateDropdown || showAccountDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowCreateDropdown(false)
            setShowAccountDropdown(false)
          }}
        />
      )}
    </header>
  )
} 