// frontend/src/app/auctions/new/page.tsx
"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import AuctionForm from '@/components/auctions/AuctionForm'
import type { Auction } from '@/lib/auctions-api'

export default function NewAuctionPage() {
  const router = useRouter()

  const handleSave = (_auction: Auction) => {
    // Redirect to auctions list or auction detail page after successful save
    router.push('/auctions')
  }

  const handleCancel = () => {
    // Go back to auctions list
    router.push('/auctions')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        
        <AuctionForm
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
} 