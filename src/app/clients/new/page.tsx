"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import ClientForm from '@/components/clients/ClientForm'

export default function AddNewClientPage() {
  const router = useRouter()
  return (
    <ClientForm
      mode="create"
      onSuccess={() => router.push('/clients')}
    />
  )
}