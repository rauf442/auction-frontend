// frontend/src/components/artists/ArtistForm.tsx
"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Sparkles, Loader2 } from 'lucide-react'
import { Artist, ArtistsAPI, AIGenerateRequest } from '@/lib/artists-api'

interface ArtistFormProps {
  artist?: Artist;
  isEditing?: boolean;
  onSaved?: (artist: Artist) => void;
}

export default function ArtistForm({ artist, isEditing = false, onSaved }: ArtistFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAIFields, setShowAIFields] = useState(false)

  const [formData, setFormData] = useState<Partial<Artist>>(() => {
    const defaults = {
      name: '',
      birth_year: undefined,
      death_year: undefined,
      nationality: '',
      art_movement: '',
      medium: '',
      description: '',
      key_description: 'THESE WORKS ARE HIGHLY SOUGHT AFTER, MUCH LIKE THOSE BY RENOWNED ARTISTS SUCH AS M.F. HUSAIN, S.H. RAZA, F.N. SOUZA, AKBAR PADAMSEE, HEMENDRANATH MAZUMDAR, RAM KUMAR, JAMINI ROY, B. PRABHA, TYEB MEHTA, AND MANY OTHERS. THEY ARE OFTEN SOLD BY AUCTIONEERS TO COLLECTORS AROUND THE GLOBE',
      biography: '',
      notable_works: '',
      exhibitions: '',
      awards: '',
      signature_style: '',
      market_value_range: '',
      status: 'active' as const,
      is_verified: false
    };

    if (artist) {
      return {
        ...defaults,
        ...artist,
        // Ensure text fields are never null
        name: artist.name || '',
        nationality: artist.nationality || '',
        art_movement: artist.art_movement || '',
        medium: artist.medium || '',
        description: artist.description || '',
        key_description: (artist as any).key_description || '',
        biography: artist.biography || '',
        notable_works: artist.notable_works || '',
        exhibitions: artist.exhibitions || '',
        awards: artist.awards || '',
        signature_style: artist.signature_style || '',
        market_value_range: artist.market_value_range || '',
        status: artist.status || 'active',
        is_verified: artist.is_verified || false
      };
    }

    return defaults;
  })

  const handleInputChange = (field: keyof Artist, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGenerateAI = async () => {
    if (!formData.name?.trim()) {
      setError('Please enter an artist name before generating AI content')
      return
    }

    try {
      setAiLoading(true)
      setError(null)

      const request: AIGenerateRequest = {
        name: formData.name
      }

      const response = await ArtistsAPI.generateAI(request)

      if (response.success) {
        // Merge AI-generated data with existing form data
        setFormData(prev => ({
          ...prev,
          ...response.data,
          name: prev.name // Keep the original name
        }))
        setShowAIFields(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI content')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name?.trim()) {
      setError('Artist name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (isEditing && artist?.id) {
        const resp = await ArtistsAPI.updateArtist(artist.id, formData)
        if (onSaved && resp?.data) {
          onSaved(resp.data)
        } else {
          router.push('/artists')
        }
      } else {
        console.log('Creating artist with data:', formData)
        const resp = await ArtistsAPI.createArtist(formData as Omit<Artist, 'id' | 'created_at' | 'updated_at'>)
        console.log('Artist creation response:', resp)
        if (onSaved && resp?.data) {
          onSaved(resp.data)
        } else {
          router.push('/artists')
        }
      }
    } catch (err: any) {
      console.error('Artist creation/update error:', err)
      setError(err.message || 'Failed to save artist')
    } finally {
      setLoading(false)
    }
  }

  const getAIIndicator = (field: string) => {
    if (formData.ai_generated_fields && formData.ai_generated_fields[field]) {
      return (
        <span className="inline-flex items-center ml-2" title="AI Generated">
          <Sparkles className="h-3 w-3 text-purple-500" />
        </span>
      )
    }
    return null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Artist' : 'Add New Artist'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* AI Generation Section */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-purple-900 flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                AI Generation
              </h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Generate comprehensive artist information using AI. Just enter the artist name above and click generate.
              </p>

              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiLoading || !formData.name?.trim()}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {aiLoading ? 'Generating...' : 'Generate AI Content'}
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Artist Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter artist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Birth Year
                {getAIIndicator('birth_year')}
              </label>
              <input
                type="number"
                value={formData.birth_year || ''}
                onChange={(e) => handleInputChange('birth_year', e.target.value ? parseInt(e.target.value) : undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 1881"
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Death Year
                {getAIIndicator('death_year')}
              </label>
              <input
                type="number"
                value={formData.death_year || ''}
                onChange={(e) => handleInputChange('death_year', e.target.value ? parseInt(e.target.value) : undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Leave empty if still alive"
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Nationality
                {getAIIndicator('nationality')}
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Spanish, French, American"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Art Movement
                {getAIIndicator('art_movement')}
              </label>
              <input
                type="text"
                value={formData.art_movement}
                onChange={(e) => handleInputChange('art_movement', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Cubism, Impressionism, Renaissance"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Primary Medium
              {getAIIndicator('medium')}
            </label>
            <input
              type="text"
              value={formData.medium}
              onChange={(e) => handleInputChange('medium', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Oil painting, sculpture, watercolor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Artist Description
              {getAIIndicator('description')}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description of the artist"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Description
            </label>
            <textarea
              rows={2}
              value={(formData as any).key_description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, key_description: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Short caption for cards or list views"
            />
          </div>

          {/* Extended Information (shown when AI is used or when editing) */}
          {(showAIFields || isEditing) && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-t pt-6">Extended Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  Biography
                  {getAIIndicator('biography')}
                </label>
                <textarea
                  rows={4}
                  value={formData.biography}
                  onChange={(e) => handleInputChange('biography', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Detailed biography"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Notable Works
                    {getAIIndicator('notable_works')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notable_works}
                    onChange={(e) => handleInputChange('notable_works', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="List of notable works"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Major Exhibitions
                    {getAIIndicator('exhibitions')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.exhibitions}
                    onChange={(e) => handleInputChange('exhibitions', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Major exhibitions and shows"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Awards & Honors
                    {getAIIndicator('awards')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.awards}
                    onChange={(e) => handleInputChange('awards', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Awards and recognition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Market Value Range
                    {getAIIndicator('market_value_range')}
                  </label>
                  <input
                    type="text"
                    value={formData.market_value_range}
                    onChange={(e) => handleInputChange('market_value_range', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., $10,000 - $100,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  Signature Style
                  {getAIIndicator('signature_style')}
                </label>
                <textarea
                  rows={3}
                  value={formData.signature_style}
                  onChange={(e) => handleInputChange('signature_style', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Description of artistic style and techniques"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_verified"
                  checked={formData.is_verified}
                  onChange={(e) => handleInputChange('is_verified', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_verified" className="ml-2 block text-sm text-gray-900">
                  Mark as verified information
                </label>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Saving...' : (isEditing ? 'Update Artist' : 'Create Artist')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 