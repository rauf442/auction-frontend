"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hasAdminAccess } from '@/lib/auth-utils'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Check if user has admin access
    if (!hasAdminAccess()) {
      // Redirect to dashboard if not admin
      router.push('/')
      return
    }
  }, [router])

  // Don't render anything while checking access
  if (!hasAdminAccess()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
