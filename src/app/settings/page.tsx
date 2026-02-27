"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hasAdminAccess } from '@/lib/auth-utils'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user has admin access
    if (!hasAdminAccess()) {
      router.push('/')
      return
    }

    // Redirect to platforms settings if admin
    router.replace('/settings/platforms')
  }, [router])

  // Don't render anything while checking access
  if (!hasAdminAccess()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Redirecting to settings...</div>
    </div>
  )
} 