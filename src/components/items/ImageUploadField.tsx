// frontend/src/components/items/ImageUploadField.tsx
"use client"

import React, { useState, useRef } from 'react'
import { Upload, X, ImageIcon, Edit } from 'lucide-react'
import MediaRenderer from '@/components/ui/MediaRenderer'
import ImageEditModal from '@/components/ui/ImageEditModal'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

interface ImageUploadFieldProps {
  label: string
  value: string
  onChange: (url: string, file?: File) => void
  itemId?: string
  imageIndex: number
  required?: boolean
  showEditButton?: boolean
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  itemId,
  imageIndex,
  required = false,
  showEditButton = false
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setError(null)
    setUploading(true)
    console.log('file', file)

    // Clean up previous blob URL if exists
    if (value && value.startsWith('blob:')) {
      URL.revokeObjectURL(value)
    }

    setSelectedFile(file)

    // Create preview URL for immediate display
    try {
      const previewUrl = URL.createObjectURL(file)
      console.log('previewUrl', previewUrl)

      // Immediately upload to Supabase if we have an itemId (for edit mode)
      if (itemId) {
        try {
          console.log('Uploading image immediately for existing item:', itemId)

          const formData = new FormData()
          formData.append('image', file)
          formData.append('itemId', itemId)
          formData.append('imageIndex', imageIndex.toString())

          const token = getAuthToken()
          const response = await fetch(`${API_BASE_URL}/images/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(`Upload failed: ${errorData.error || response.statusText}`)
          }

          const result = await response.json()
          console.log('Upload successful:', result.url)

          // Clean up blob URL and use the real URL
          URL.revokeObjectURL(previewUrl)
          onChange(result.url)
          setUploading(false)
          return
        } catch (uploadError: any) {
          console.error('Immediate upload failed:', uploadError)
          setError(`Upload failed: ${uploadError.message}`)
          // Fall back to blob URL for preview
          onChange(previewUrl, file)
          setUploading(false)
          return
        }
      }

      // For new items (no itemId yet), use blob URL for preview and mark as pending
      onChange(previewUrl, file)
      setUploading(false)
    } catch (err) {
      console.log('Error creating preview:', err)
      // Fallback to FileReader if blob creation fails
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          onChange(e.target.result as string, file)
        }
      }
      reader.onerror = () => {
        setError('Failed to create image preview')
      }
      reader.readAsDataURL(file)
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!value) return

    try {
      setUploading(true)

      // If it's an existing image (has URL), try to delete it
      if (value.includes('supabase') && itemId) {
        const token = getAuthToken()
        if (token) {
          // Extract filename from URL for deletion
          const urlParts = value.split('/')
          const filename = urlParts[urlParts.length - 1]

          await fetch(`${API_BASE_URL}/images/${itemId}/${filename}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
        }
      }

      // Clean up preview URL if it's a blob URL
      if (value.startsWith('blob:')) {
        URL.revokeObjectURL(value)
      }

      // Clear the field
      setSelectedFile(null)
      onChange('')
    } catch (err: any) {
      console.error('Failed to delete image:', err)
      // Still clear the field even if deletion fails
      setSelectedFile(null)
      onChange('')
    } finally {
      setUploading(false)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleEditImage = () => {
    setShowImageEditor(true)
  }

  const handleImageUpdate = async (newImageUrl: string | null, index: number) => {
    if (newImageUrl === null) {
      // Delete image - clear the field
      setSelectedFile(null)
      onChange('')
    } else {
      // Replace image with the new URL from editing
      onChange(newImageUrl)
    }
    setShowImageEditor(false)
  }

  const isPreviewUrl = value.startsWith('blob:')
  const hasImage = value && value.trim() !== ''
  if (value) {
    console.log('value', value)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
        {imageIndex === 1 && <span className="text-xs text-gray-500"> (Primary)</span>}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Display current image or upload area */}
      {hasImage ? (
        <div className="relative group">
          {/* Image Preview using MediaRenderer */}
          <MediaRenderer
            src={value}
            alt={`${label} preview`}
            className="w-full h-32 object-cover"
            aspectRatio="auto"
            showEditButton={showEditButton}
            onEdit={handleEditImage}
            containerProps={{
              style: {
                backgroundColor: '#f3f4f6',
                minHeight: '128px'
              }
            }}
          />

          {/* Fallback content for broken images */}
          {error && error.includes('Unable to load') && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-xs">Preview not available</p>
                {selectedFile && (
                  <p className="text-xs mt-1">File: {selectedFile.name}</p>
                )}
              </div>
            </div>
          )}

          {/* Status indicator for unsaved files */}
          {isPreviewUrl && (
            <div className={`absolute ${showEditButton ? 'top-2 left-2' : 'top-2 right-2'} z-10`}>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Pending Upload
              </span>
            </div>
          )}

          {/* Remove button overlay - only show when edit button is not always visible */}
          {!showEditButton && (
            <div className="absolute top-2 right-2 flex gap-2 transition-all duration-200">
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 disabled:opacity-50"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Remove button for always-visible edit button mode */}
          {showEditButton && (
            <div className="absolute top-2 right-12 flex gap-2 transition-all duration-200">
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 disabled:opacity-50"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Image info */}
          {!isPreviewUrl && (
            <input
              type="text"
              value={value}
              readOnly
              className="w-full mt-2 px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              placeholder="Image URL"
            />
          )}

          {selectedFile && isPreviewUrl && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-gray-500"> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          )}

          {/* Replace button */}
          <button
            type="button"
            onClick={openFileDialog}
            disabled={uploading}
            className="mt-2 flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Processing...' : 'Replace Image'}
          </button>
        </div>
      ) : (
        <div>
          {/* Upload Area */}
          <button
            type="button"
            onClick={openFileDialog}
            disabled={uploading}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 focus:border-teal-500 focus:outline-none transition-colors disabled:opacity-50 flex flex-col items-center justify-center space-y-2"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">Click to select image</span>
                <span className="text-xs text-gray-400">JPG, PNG, GIF up to 10MB</span>
                <span className="text-xs text-orange-600">Will upload when you save the item</span>
              </>
            )}
          </button>

          {/* URL input (fallback) */}
          <div className="mt-2">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Or paste image URL"
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={showImageEditor}
        onClose={() => setShowImageEditor(false)}
        currentImageUrl={value}
        imageIndex={imageIndex}
        itemTitle={label}
        itemId={itemId || undefined}
        onImageUpdate={handleImageUpdate}
      />
    </div>
  )
}
