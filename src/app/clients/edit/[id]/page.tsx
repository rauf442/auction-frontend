"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ClientForm from '@/components/clients/ClientForm'
import { fetchClient } from '@/lib/clients-api'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = parseInt(params.id as string, 10)
  const [initialData, setInitialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const resp = await fetchClient(clientId)
        setInitialData(resp.data || resp)
      } finally {
        setLoading(false)
      }
    }
    if (clientId) load()
  }, [clientId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>

  return (
    <ClientForm
      mode="edit"
      clientId={clientId}
      initialData={initialData}
      onSuccess={() => router.push('/clients')}
    />
  )
}