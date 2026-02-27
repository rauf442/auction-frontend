// frontend/src/app/consignments/new/page.tsx
"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import ConsignmentForm from '@/components/consignments/ConsignmentForm'
import type { Consignment } from '@/lib/consignments-api'

export default function NewConsignmentPage() {
  const router = useRouter()

  const handleSave = (consignment: Consignment) => {
    // Redirect to consignments list or consignment detail page after successful save
    router.push('/consignments')
  }

  const handleCancel = () => {
    // Go back to consignments list
    router.push('/consignments')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Consignment</h1>
          <p className="mt-2 text-gray-600">Fill in the details below to create a new consignment.</p>
        </div>
        
        <ConsignmentForm
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
} 