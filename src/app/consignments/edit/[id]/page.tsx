// frontend/src/app/consignments/edit/[id]/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ConsignmentForm from '@/components/consignments/ConsignmentForm'
import { getConsignment, type Consignment } from '@/lib/consignments-api'

export default function EditConsignmentPage() {
  const router = useRouter()
  const params = useParams()
  const consignmentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [consignment, setConsignment] = useState<Consignment | undefined>(undefined)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await getConsignment(consignmentId)
        setConsignment(data)
      } finally {
        setLoading(false)
      }
    }
    if (consignmentId) load()
  }, [consignmentId])

  const handleSave = () => {
    router.push('/consignments')
  }

  const handleCancel = () => {
    router.push('/consignments')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Consignment</h1>
          <p className="mt-2 text-gray-600">Update the details below.</p>
        </div>
        <ConsignmentForm consignment={consignment} onSave={handleSave} onCancel={handleCancel} />
      </div>
    </div>
  )
}
