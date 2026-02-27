// frontend/src/app/artists/edit/[id]/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import ArtistForm from '@/components/artists/ArtistForm'
import { Artist, ArtistsAPI } from '@/lib/artists-api'

export default function EditArtistPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const artistId = params?.id as string

  useEffect(() => {
    const fetchArtist = async () => {
      if (!artistId) {
        setError('Artist ID not found')
        setLoading(false)
        return
      }

      try {
        const response = await ArtistsAPI.getArtist(artistId)
        if (response.success) {
          setArtist(response.data)
        } else {
          setError('Artist not found')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load artist')
      } finally {
        setLoading(false)
      }
    }

    fetchArtist()
  }, [artistId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading artist...</p>
        </div>
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Artist</h2>
          <p className="text-gray-600 mb-4">{error || 'Artist not found'}</p>
          <button
            onClick={() => router.push('/artists')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Artists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Artist</h1>
          <p className="text-gray-600">Update {artist.name}'s information</p>
        </div>
      </div>
      
      <ArtistForm artist={artist} isEditing={true} />
    </div>
  )
} 