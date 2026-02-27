// frontend/admin/src/app/xero/layout.tsx
import React from 'react'

interface XeroLayoutProps {
  children: React.ReactNode
}

export default function XeroLayout({ children }: XeroLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
