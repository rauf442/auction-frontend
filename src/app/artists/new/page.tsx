// frontend/src/app/artists/new/page.tsx
"use client"

import ArtistForm from '@/components/artists/ArtistForm'

export default function NewArtistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Artist</h1>
          <p className="text-gray-600">Create a new artist profile with AI-powered content generation</p>
        </div>
      </div>
      
      <ArtistForm />
    </div>
  )
} 