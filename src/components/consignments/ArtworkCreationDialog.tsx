// frontend/src/components/consignments/ArtworkCreationDialog.tsx
"use client"

import React, { useState } from 'react'
import { ArtworksAPI } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import AIImageUpload from '@/components/items/AIImageUpload'
import AIBulkGenerationModal from '@/components/items/AIBulkGenerationModal'
import ImageUploadField from '@/components/items/ImageUploadField'
import { Sparkles, Edit3, Upload, X } from 'lucide-react'

interface ArtworkCreationDialogProps {
  artists: Artist[]
  onSave: (artwork: any | any[]) => void
  onCancel: () => void
}

export default function ArtworkCreationDialog({ artists, onSave, onCancel }: ArtworkCreationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showAIUpload, setShowAIUpload] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [creationMode, setCreationMode] = useState<'choose' | 'ai' | 'manual'>('choose')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    low_est: '',
    high_est: '',
    start_price: '',
    artist_id: '',
    artist_maker: '',
    height_inches: '',
    width_inches: '',
    height_cm: '',
    width_cm: '',
    height_with_frame_inches: '',
    width_with_frame_inches: '',
    height_with_frame_cm: '',
    width_with_frame_cm: '',
    weight: '',
    materials: '',
    condition: '',
    category: '',
    subcategory: '',
    status: 'draft' as const
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-calculate start price when low estimate changes
    if (field === 'low_est' && value) {
      const lowEst = parseFloat(value)
      if (!isNaN(lowEst)) {
        setFormData(prev => ({
          ...prev,
          start_price: Math.round(lowEst * 0.5).toString()
        }))
      }
    }
  }

  const handleImageUpload = (imageUrl: string, file?: File) => {
    if (imageUrl && !uploadedImages.includes(imageUrl)) {
      setUploadedImages(prev => [...prev, imageUrl])
    }
  }

  const removeImage = (imageUrl: string) => {
    setUploadedImages(prev => prev.filter(img => img !== imageUrl))
  }

  const handleArtistChange = (artistId: string) => {
    const selectedArtist = artists.find(a => a.id?.toString() === artistId)
    if (selectedArtist) {
      setFormData(prev => ({
        ...prev,
        artist_id: artistId,
        artist_maker: selectedArtist.name
      }))
    }
  }

  const handleAIUploadComplete = async (result: any) => {
    if (result) {
      setLoading(true)
      try {
        console.log('AI Upload Result:', result) // Debug log

        // Validate required fields
        if (!result.title || !result.description) {
          throw new Error('AI analysis missing required fields (title or description)')
        }

        let uploadedImageUrl = result.imageUrl

        // If the image is a blob URL, we need to upload it to the server first
        if (result.imageUrl && result.imageUrl.startsWith('blob:')) {
          try {
            console.log('Converting blob URL to uploaded file...')

            // Fetch the blob and create a FormData for upload
            const response = await fetch(result.imageUrl)
            const blob = await response.blob()

            const formData = new FormData()
            formData.append('file', blob, 'ai_analysis_image.jpg')

            // Try to upload the image to your server
            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formData
            })

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json()
              uploadedImageUrl = uploadResult.url
              console.log('Image uploaded successfully:', uploadedImageUrl)
            } else {
              console.warn('Failed to upload image, proceeding without image')
              uploadedImageUrl = undefined
            }
          } catch (uploadError) {
            console.warn('Image upload failed, proceeding without image:', uploadError)
            uploadedImageUrl = undefined
          }
        }

        // Create artwork with AI analysis result and uploaded images
        const artworkData = {
          title: result.title.trim(),
          description: result.description.trim(),
          low_est: parseFloat(result.low_est) || 0,
          high_est: parseFloat(result.high_est) || 0,
          start_price: result.start_price ? parseFloat(result.start_price) : Math.round((parseFloat(result.low_est) || 0) * 0.5),
          artist_id: result.artist_id ? parseInt(result.artist_id.toString()) : undefined,
          artist_maker: result.artist_name || result.artist_maker || '',
          height_inches: result.height_inches || '',
          width_inches: result.width_inches || '',
          height_cm: result.height_cm || '',
          width_cm: result.width_cm || '',
          height_with_frame_inches: result.height_with_frame_inches || '',
          width_with_frame_inches: result.width_with_frame_inches || '',
          height_with_frame_cm: result.height_with_frame_cm || '',
          width_with_frame_cm: result.width_with_frame_cm || '',
          weight: result.weight || '',
          materials: result.materials || '',
          condition: result.condition || '',
          category: result.category || '',
          status: 'draft' as const,
          // Add the uploaded image from AI analysis as images array
          images: uploadedImageUrl ? [uploadedImageUrl] : []
        }

        console.log('Artwork data to create:', artworkData) // Debug log

        const artworkResult = await ArtworksAPI.createArtwork(artworkData)

        console.log('Artwork creation result:', artworkResult) // Debug log

        // If artwork was created successfully, return it to the parent
        if (artworkResult.success && artworkResult.data) {
          onSave(artworkResult.data)
          setShowAIUpload(false)
          setCreationMode('choose') // Reset to choose mode
        } else {
          throw new Error(artworkResult.message || 'Failed to create artwork')
        }
      } catch (error: any) {
        console.error('Error creating artwork from AI analysis:', error)
        const errorMessage = error.message || 'Failed to create artwork from AI analysis. Please try again.'
        alert(`Error: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBulkUploadComplete = (results: any[]) => {
    if (results && results.length > 0) {
      // For bulk upload, return all artworks created
      onSave(results)
      setShowBulkUpload(false)
      setCreationMode('choose') // Reset to choose mode
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const artworkData = {
        title: formData.title,
        description: formData.description,
        low_est: parseFloat(formData.low_est) || 0,
        high_est: parseFloat(formData.high_est) || 0,
        start_price: parseFloat(formData.start_price) || 0,
        artist_id: formData.artist_id ? parseInt(formData.artist_id) : undefined,
        artist_maker: formData.artist_maker,
        height_inches: formData.height_inches,
        width_inches: formData.width_inches,
        height_cm: formData.height_cm,
        width_cm: formData.width_cm,
        height_with_frame_inches: formData.height_with_frame_inches,
        width_with_frame_inches: formData.width_with_frame_inches,
        height_with_frame_cm: formData.height_with_frame_cm,
        width_with_frame_cm: formData.width_with_frame_cm,
        weight: formData.weight,
        materials: formData.materials,
        condition: formData.condition,
        category: formData.category,
        subcategory: formData.subcategory,
        status: formData.status,
        // Add uploaded images as images array
        images: uploadedImages.filter(url => url && url.trim())
      }

      const result = await ArtworksAPI.createArtwork(artworkData)
      onSave(result.data)
    } catch (error) {
      console.error('Error creating artwork:', error)
      alert('Failed to create artwork. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      {creationMode === 'choose' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">How would you like to create the artwork?</h3>
            <p className="text-gray-600">Choose between AI-powered analysis or manual entry</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Analysis Option */}
            <div className="border border-blue-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer"
                 onClick={() => setCreationMode('ai')}>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis</h4>
                <p className="text-gray-600 mb-4">
                  Upload images and let AI generate artwork details automatically
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAIUpload(true)
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Single Image Analysis
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowBulkUpload(true)
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Folder Upload
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Entry Option */}
            <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors cursor-pointer"
                 onClick={() => setCreationMode('manual')}>
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit3 className="w-8 h-8 text-gray-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Manual Entry</h4>
                <p className="text-gray-600 mb-4">
                  Enter artwork details manually with image upload support
                </p>
                <button
                  type="button"
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Manual Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {creationMode === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Back to Mode Selection */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCreationMode('choose')}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              ← Back to options
            </button>
            <h3 className="text-lg font-semibold">Manual Artwork Entry</h3>
          </div>

          {/* Image Upload Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Artwork Images</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {uploadedImages.map((imageUrl, index) => (
                <div key={index} className="relative">
                  <img
                    src={imageUrl}
                    alt={`Artwork ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(imageUrl)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <ImageUploadField
                label=""
                value=""
                onChange={handleImageUpload}
                imageIndex={uploadedImages.length + 1}
              />
            </div>
            <p className="text-sm text-gray-600">
              Upload unlimited images. First image will be used as the primary image.
            </p>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artist
              </label>
              <SearchableSelect
                value={formData.artist_id}
                onChange={handleArtistChange}
                options={artists.map(artist => ({
                  value: artist.id?.toString() || '',
                  label: artist.name
                }))}
                placeholder="Select or search artist"
              />
              {!formData.artist_id && (
                <input
                  type="text"
                  value={formData.artist_maker}
                  onChange={(e) => handleInputChange('artist_maker', e.target.value)}
                  placeholder="Or enter artist name manually"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                />
              )}
            </div>

            {/* New Dimensions with inch/cm conversion */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height (inches)</label>
                    <input
                      type="text"
                      value={formData.height_inches}
                      onChange={(e) => handleInputChange('height_inches', e.target.value)}
                      placeholder='e.g., 24"'
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Width (inches)</label>
                    <input
                      type="text"
                      value={formData.width_inches}
                      onChange={(e) => handleInputChange('width_inches', e.target.value)}
                      placeholder='e.g., 36"'
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
                    <input
                      type="text"
                      value={formData.height_cm}
                      onChange={(e) => handleInputChange('height_cm', e.target.value)}
                      placeholder="e.g., 61 cm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Width (cm)</label>
                    <input
                      type="text"
                      value={formData.width_cm}
                      onChange={(e) => handleInputChange('width_cm', e.target.value)}
                      placeholder="e.g., 91 cm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight
                </label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="e.g., 2.5kg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Estimate (£) *
              </label>
              <input
                type="number"
                value={formData.low_est}
                onChange={(e) => handleInputChange('low_est', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                High Estimate (£) *
              </label>
              <input
                type="number"
                value={formData.high_est}
                onChange={(e) => handleInputChange('high_est', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Materials
              </label>
              <input
                type="text"
                value={formData.materials}
                onChange={(e) => handleInputChange('materials', e.target.value)}
                placeholder="e.g., Oil on canvas"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select condition</option>
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="Paintings">Paintings</option>
                <option value="Sculptures">Sculptures</option>
                <option value="Prints">Prints</option>
                <option value="Drawings">Drawings</option>
                <option value="Photography">Photography</option>
                <option value="Textiles">Textiles</option>
                <option value="Ceramics">Ceramics</option>
                <option value="Jewelry">Jewelry</option>
                <option value="Furniture">Furniture</option>
                <option value="Books">Books</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Price (£)
              </label>
              <input
                type="number"
                value={formData.start_price}
                onChange={(e) => handleInputChange('start_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated as 50% of low estimate</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => setCreationMode('choose')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Artwork'}
            </button>
          </div>
        </form>
      )}

      {/* AI Upload Modal */}
      {showAIUpload && (
        <AIImageUpload
          onUploadComplete={handleAIUploadComplete}
          onClose={() => {
            setShowAIUpload(false)
            setCreationMode('choose')
          }}
          currentBrand="MSABER"
          onArtworkCreated={(artwork) => {
            // When AI creates artwork, pass it to the parent onSave callback
            onSave(artwork)
            setShowAIUpload(false)
            setCreationMode('choose')
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <AIBulkGenerationModal
          onClose={() => {
            setShowBulkUpload(false)
            setCreationMode('choose')
          }}
          onComplete={handleBulkUploadComplete}
        />
      )}
    </div>
  )
}
