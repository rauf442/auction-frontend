// frontend/src/app/items/new/page.tsx
"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import ItemForm from '@/components/items/ItemForm'
import type { Artwork } from '@/lib/items-api'
import { ArrowLeft } from 'lucide-react'

export default function NewItemPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.push('/items')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Artworks
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Artwork</h1>
          <p className="mt-2 text-gray-600">Add a new artwork to your collection with detailed information and images.</p>
        </div>
        
        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <ItemForm 
            mode="create"
          />
        </div>
      </div>
    </div>
  )
} 