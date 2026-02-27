// frontend/src/components/ui/MediaRenderer.tsx
"use client"

import React, { useState } from 'react'
import { Trophy, Edit3 } from 'lucide-react'

// Utility functions for external use
export const extractDriveFileId = (url: string): string | null => {
  if (!url) return null

  // Handle different Google Drive URL formats
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,      // /file/d/FILE_ID
    /\/open\?id=([a-zA-Z0-9_-]+)/,      // /open?id=FILE_ID
    /\/uc\?export=view&id=([a-zA-Z0-9_-]+)/,  // /uc?export=view&id=FILE_ID
    /id=([a-zA-Z0-9_-]+)/,              // id=FILE_ID (fallback)
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export const isDriveUrl = (url: string): boolean => {
  return Boolean(url && (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com')
  ))
}

interface MediaRendererProps {
  /** The media URL or array of URLs */
  src: string | string[]
  /** Alt text for the image/iframe */
  alt?: string
  /** CSS classes for styling */
  className?: string
  /** Additional props for the container div */
  containerProps?: React.HTMLAttributes<HTMLDivElement>
  /** Whether to show controls (for Google Drive embeds) */
  showControls?: boolean
  /** Container aspect ratio */
  aspectRatio?: 'square' | 'video' | 'auto'
  /** Click handler */
  onClick?: () => void
  /** Custom placeholder content */
  placeholder?: React.ReactNode
  /** Whether to show edit button */
  showEditButton?: boolean
  /** Edit button click handler */
  onEdit?: () => void
}

/**
 * MediaRenderer component that handles both regular images and Google Drive images
 * Automatically detects Google Drive URLs and renders them using img tags with the new lh3 format
 */
export default function MediaRenderer({
  src,
  alt = '',
  className = '',
  containerProps = {},
  showControls = false,
  aspectRatio = 'square',
  onClick,
  placeholder,
  showEditButton = false,
  onEdit
}: MediaRendererProps) {
  // Extract the first URL if it's an array
  const mediaUrl = Array.isArray(src) ? src[0] : src

  // State to track if media failed to load
  const [mediaError, setMediaError] = useState(false)

  // Helper function to check if width or height classes are already present
  const hasSizeClasses = (classes: string) => {
    return /\b(w|h)-\d+/.test(classes) || /\b(w|h)-\w+/.test(classes)
  }

  // Function to render Google Drive image using img tag with new format
  const renderDriveImage = (url: string, altText: string) => {
    const fileId = extractDriveFileId(url)

    if (!fileId || mediaError) {
      return renderPlaceholder()
    }

    // Use new Google Drive image format
    const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`

    // Only apply w-full h-full if no size classes are specified
    const sizeClasses = hasSizeClasses(className) ? '' : 'w-full h-full'

    return (
      <div className="relative">
        <img
          src={imageUrl}
          alt={altText}
          className={`${className} ${sizeClasses} object-cover group-hover:scale-105 transition-transform duration-200`}
          onClick={onClick}
          onError={() => setMediaError(true)}
          onLoad={() => setMediaError(false)}
        />
        {showEditButton && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="absolute top-2 right-2 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md z-20"
            title="Edit image"
          >
            <Edit3 className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  // Function to render regular image
  const renderImage = (url: string, altText: string) => {
    if (mediaError) {
      return renderPlaceholder()
    }

    // Only apply w-full h-full if no size classes are specified
    const sizeClasses = hasSizeClasses(className) ? '' : 'w-full h-full'

    return (
      <div className="relative">
        <img
          src={url}
          alt={altText}
          className={`${className} ${sizeClasses} object-cover group-hover:scale-105 transition-transform duration-200`}
          onClick={onClick}
          onError={() => setMediaError(true)}
          onLoad={() => setMediaError(false)}
        />
        {showEditButton && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="absolute top-2 right-2 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md z-20"
            title="Edit image"
          >
            <Edit3 className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  // Function to render placeholder
  const renderPlaceholder = () => {
    if (placeholder) {
      return <>{placeholder}</>
    }

    return (
      <div className={`w-full h-full flex items-center justify-center text-gray-300 bg-gray-100 ${className}`}>
        <Trophy className="h-16 w-16" />
      </div>
    )
  }

  // Determine container classes based on aspect ratio
  const getContainerClasses = () => {
    const baseClasses = 'bg-gray-50 overflow-hidden relative'

    // If custom size classes are provided, don't apply aspect ratio
    if (hasSizeClasses(className)) {
      return baseClasses
    }

    switch (aspectRatio) {
      case 'square':
        return `${baseClasses} aspect-square`
      case 'video':
        return `${baseClasses} aspect-video`
      case 'auto':
        return `${baseClasses}`
      default:
        return `${baseClasses} aspect-square`
    }
  }

  // Main render logic
  const renderMedia = () => {
    if (!mediaUrl || mediaError) {
      return renderPlaceholder()
    }

    if (isDriveUrl(mediaUrl)) {
      return renderDriveImage(mediaUrl, alt)
    } else {
      return renderImage(mediaUrl, alt)
    }
  }

  return (
    <div
      className={getContainerClasses()}
      {...containerProps}
    >
      {renderMedia()}
    </div>
  )
}
