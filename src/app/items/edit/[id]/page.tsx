// frontend/src/app/items/edit/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ItemForm from '@/components/items/ItemForm'
import type { Artwork } from '@/lib/items-api'
import { ArtworksAPI } from '@/lib/items-api'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function EditItemPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadArtwork = async () => {
      try {
        setLoading(true)
        setError(null)
        const artworkResponse = await ArtworksAPI.getArtwork(itemId)
        setArtwork(artworkResponse.data || artworkResponse)
      } catch (err: any) {
        console.error('Error loading artwork:', err)
        setError(err.message || 'Failed to load artwork')
      } finally {
        setLoading(false)
      }
    }

    if (itemId) {
      loadArtwork()
    }
  }, [itemId])



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading artwork...</p>
        </div>
      </div>
    )
  }

  if (error || !artwork) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Artwork not found'}</p>
          <button
            onClick={() => router.push('/items')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Artworks
          </button>
        </div>
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Edit Artwork</h1>
          <p className="mt-2 text-gray-600">Update artwork details, images, and information.</p>
          {artwork.title && (
            <p className="mt-1 text-sm text-gray-500">Editing: {artwork.title}</p>
          )}
        </div>
        
        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <ItemForm 
            mode="edit"
            itemId={itemId}
          />
        </div>
      </div>
    </div>
  )
} 