// frontend/admin/src/components/ui/ImageEditModal.tsx
"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, Trash2, Loader2, RotateCw, RotateCcw, RefreshCw, Crop } from 'lucide-react'
import Cropper from 'cropperjs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Basic Cropper.js CSS styles
const cropperStyles = `
cropper-canvas {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
}
  .cropper-container {
    position: relative;
    font-size: 0;
    line-height: 0;
    direction: ltr;
    touch-action: none;
    user-select: none;
    -webkit-user-drag: none;
  }
  .cropper-modal {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
  .cropper-crop-box {
    position: absolute;
    border: 1px solid #39f;
    border-radius: 3px;
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.1);
  }
  .cropper-view-box {
    position: absolute;
    border: 1px solid #39f;
    border-radius: 3px;
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.1);
    outline: 1px solid rgba(255, 255, 255, 0.75);
    outline-color: rgba(255, 255, 255, 0.75);
  }
  .cropper-face,
  .cropper-line,
  .cropper-point {
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0.1;
  }
  .cropper-face {
    top: 0;
    left: 0;
    background-color: #fff;
  }
  .cropper-line {
    background-color: #39f;
  }
  .cropper-line.line-e {
    width: 5px;
    right: -3px;
    top: 0;
    cursor: e-resize;
  }
  .cropper-line.line-n {
    height: 5px;
    left: 0;
    top: -3px;
    cursor: n-resize;
  }
  .cropper-line.line-w {
    width: 5px;
    left: -3px;
    top: 0;
    cursor: w-resize;
  }
  .cropper-line.line-s {
    height: 5px;
    left: 0;
    bottom: -3px;
    cursor: s-resize;
  }
  .cropper-point {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #39f;
    opacity: 0.75;
  }
  .cropper-point.point-e {
    right: -3px;
    top: 50%;
    margin-top: -3px;
    cursor: e-resize;
  }
  .cropper-point.point-n {
    top: -3px;
    left: 50%;
    margin-left: -3px;
    cursor: n-resize;
  }
  .cropper-point.point-w {
    left: -3px;
    top: 50%;
    margin-top: -3px;
    cursor: w-resize;
  }
  .cropper-point.point-s {
    bottom: -3px;
    left: 50%;
    margin-left: -3px;
    cursor: s-resize;
  }
  .cropper-point.point-ne {
    right: -3px;
    top: -3px;
    cursor: ne-resize;
  }
  .cropper-point.point-nw {
    left: -3px;
    top: -3px;
    cursor: nw-resize;
  }
  .cropper-point.point-sw {
    left: -3px;
    bottom: -3px;
    cursor: sw-resize;
  }
  .cropper-point.point-se {
    right: -3px;
    bottom: -3px;
    cursor: se-resize;
  }
  .cropper-point.point-se::before {
    position: absolute;
    right: -50%;
    bottom: -50%;
    width: 200%;
    height: 200%;
    content: ' ';
    opacity: 0;
  }
`

// Helper functions for Google Drive URLs (matching MediaRenderer implementation)
const isDriveUrl = (url: string): boolean => {
  return Boolean(url && (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com')
  ))
}

const extractDriveFileId = (url: string): string | null => {
  if (!url) return null

  // Handle different Google Drive URL formats (same as MediaRenderer)
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

interface ImageEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentImageUrl: string
  imageIndex: number
  itemTitle: string
  itemId?: string | null
  onImageUpdate: (newImageUrl: string | null, index: number) => Promise<void>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export default function ImageEditModal({
  isOpen,
  onClose,
  currentImageUrl,
  imageIndex,
  itemTitle,
  itemId,
  onImageUpdate
}: ImageEditModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [localImageBlob, setLocalImageBlob] = useState<Blob | null>(null)
  const [isDownloadingImage, setIsDownloadingImage] = useState(false)
  const [isExplicitClose, setIsExplicitClose] = useState(false)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('')
  const [brightness, setBrightness] = useState(100)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  // ✅ FIX: debounce timer for real-time brightness preview
  const brightnessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fineRotation, setFineRotation] = useState(0)

  // Download image when modal opens
  useEffect(() => {
    if (isOpen && currentImageUrl && !localImageBlob && !previewUrl) {
      downloadImageForEditing()
    }
  }, [isOpen, currentImageUrl])

  // Inject CSS styles for cropper
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = cropperStyles
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Helper: initialize cropper and auto-select exactly the image bounds
  const initCropperWithFullSelection = (imgEl: HTMLImageElement) => {
    cropperRef.current = new Cropper(imgEl)

    setTimeout(() => {
      const cropper = cropperRef.current
      if (!cropper) return

      // Center the image
      const image = cropper.getCropperImage?.()
      if (image?.$center) {
        image.$center('contain')
      }

      // Auto-select exactly the image bounds (not the full canvas with padding)
      setTimeout(() => {
        const selection = document.querySelector('cropper-selection') as any
        const cropperImage = document.querySelector('cropper-image') as any
        const cropperCanvas = document.querySelector('cropper-canvas') as any
        if (selection && selection.$change && cropperImage && cropperCanvas) {
          const canvasRect = cropperCanvas.getBoundingClientRect()
          const imageRect = cropperImage.getBoundingClientRect()
          // Calculate image position relative to the canvas
          const x = imageRect.left - canvasRect.left
          const y = imageRect.top - canvasRect.top
          const w = imageRect.width
          const h = imageRect.height
          selection.$change(x, y, w, h)
        }
      }, 400)
    }, 300)
  }

  // Initialize cropper when image is loaded
  useEffect(() => {
    if (previewUrl && imageRef.current && !cropperRef.current) {
      initCropperWithFullSelection(imageRef.current)
    }
  }, [previewUrl])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Destroy cropper instance
      if (cropperRef.current) {
        cropperRef.current.destroy()
        cropperRef.current = null
      }

      setPreviewUrl(null)
      setLocalImageBlob(null)
      setUploadError(null)
      setImageLoadError(false)
      setIsDownloadingImage(false)
      setCroppedImageUrl('')
      setFineRotation(0)
    }
  }, [isOpen])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image file size must be less than 10MB')
      return
    }

    setUploadError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setUploadError('Please select an image to upload')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const file = fileInputRef.current.files[0]
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      await onImageUpdate(base64, imageIndex)

      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    } catch (error) {
      setUploadError('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this image from "${itemTitle}"?`)) {
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      await onImageUpdate(null, imageIndex)
      onClose()
    } catch (error) {
      setUploadError('Failed to delete image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }


const handleReset = async () => {
  if (!cropperRef.current || !imageRef.current) return

  // ── Step 1: Destroy the current cropper instance completely
  cropperRef.current.destroy()
  cropperRef.current = null

  // ── Step 2: Reset brightness state and CSS filter
  setBrightness(100)
  setFineRotation(0)

  // ── Step 3: Clear the preview
  setCroppedImageUrl('')

  // ── Step 4: Re-initialize fresh cropper with full selection (same as initial load)
  setTimeout(() => {
    if (!imageRef.current) return

    initCropperWithFullSelection(imageRef.current)

    // Clear any leftover CSS brightness filter
    setTimeout(() => {
      const canvas = document.querySelector('cropper-canvas') as any
      if (canvas) canvas.style.filter = 'brightness(100%)'
    }, 450)
  }, 50)
}

const applyBrightnessToCanvas = (canvas: HTMLCanvasElement, brightnessValue: number): HTMLCanvasElement => {
  if (brightnessValue === 100) return canvas
  
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return canvas
  
  tempCtx.filter = `brightness(${brightnessValue}%)`
  tempCtx.drawImage(canvas, 0, 0)
  
  return tempCanvas
}

// ✅ FIX: Shared render function used by both handleCrop and handleBrightnessChange
const renderPreview = async (brightnessValue: number) => {
  if (!cropperRef.current) return

  const selection = document.querySelector('cropper-selection') as any
  if (!selection || !selection.$toCanvas) return

  try {
    const canvas = await selection.$toCanvas({ width: 800, height: 600 })
    const finalCanvas = applyBrightnessToCanvas(canvas, brightnessValue)
    const croppedUrl = finalCanvas.toDataURL('image/jpeg', 0.9)
    setCroppedImageUrl(croppedUrl)
  } catch (error) {
    console.error('Preview render failed:', error)
  }
}

const handleBrightnessChange = (value: number) => {
  setBrightness(value)
  
  // Apply brightness to the cropper canvas via CSS filter (instant visual feedback)
  const canvas = document.querySelector('cropper-canvas') as any
  if (canvas) {
    canvas.style.filter = `brightness(${value}%)`
  }

  // ✅ FIX: Debounce preview re-render so it updates live as you drag
  if (brightnessTimerRef.current) {
    clearTimeout(brightnessTimerRef.current)
  }
  brightnessTimerRef.current = setTimeout(() => {
    renderPreview(value)
  }, 80)
}

const handleCrop = async () => {
  await renderPreview(brightness)
}

  const handleRotate = (degrees: number) => {
  const cropper = cropperRef.current
  if (!cropper) return

  const image = cropper.getCropperImage?.()
  if (!image) return

  image.$rotate(degrees)
}
const handleFineRotate = (value: number) => {
  const cropper = cropperRef.current
  if (!cropper) return

  const image = cropper.getCropperImage?.()
  if (!image) return

  const delta = value - fineRotation
  setFineRotation(value)
  
  // Convert degrees to radians
  const deltaInRadians = delta * (Math.PI / 180)
  image.$rotate(deltaInRadians)
}
  // Apply crop and get final image
const applyChanges = async () => {
  if (!cropperRef.current) return

  try {
    setIsUploading(true)
    setUploadError(null)

    const selection = document.querySelector('cropper-selection') as any
    
    if (!selection || !selection.$toCanvas) {
      throw new Error('Cropper selection not found')
    }

    const canvas = await selection.$toCanvas({
      width: 800,
      height: 600
    })

    // Apply brightness to final image
    const finalCanvas = applyBrightnessToCanvas(canvas, brightness)
    const base64Url = finalCanvas.toDataURL('image/jpeg', 0.9)
    
    await onImageUpdate(base64Url, imageIndex)
    onClose()

  } catch (error) {
    console.error('Failed to apply changes:', error)
    setUploadError('Failed to apply changes. Please try again.')
  } finally {
    setIsUploading(false)
  }
}
  const setObjectPreview = (blob: Blob) => {
  if (objectUrlRef.current) {
    URL.revokeObjectURL(objectUrlRef.current)
  }

  const objectUrl = URL.createObjectURL(blob)
  objectUrlRef.current = objectUrl
  setPreviewUrl(objectUrl)
}


  const handleClose = () => {
    setPreviewUrl(null)
    setUploadError(null)
    setImageLoadError(false)
    setLocalImageBlob(null)
    setIsDownloadingImage(false)
    setCroppedImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  // Function to download image from Google Drive or regular URL
  const downloadImageForEditing = async (): Promise<Blob | null> => {
    if (!currentImageUrl) return null

    try {
      setIsDownloadingImage(true)
      setUploadError(null)

      // If it's already a data URL or blob URL, we can use it directly
      if (currentImageUrl.startsWith('data:') || currentImageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(currentImageUrl)
          const blob = await response.blob()
          setLocalImageBlob(blob)
          setPreviewUrl(currentImageUrl)
          return blob
        } catch (error) {
          console.warn('Failed to process local URL, trying proxy:', error)
        }
      }

      let imageUrl = currentImageUrl
      if (isDriveUrl(currentImageUrl)) {
        const fileId = extractDriveFileId(currentImageUrl)
        if (fileId) {
          imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`
        } else {
          throw new Error('Could not extract Google Drive file ID from URL')
        }
      }

      const proxyUrl = `${API_BASE_URL}/images/proxy?url=${encodeURIComponent(imageUrl)}`

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      })

      if (!response.ok) {
        // Fallback to direct fetch
        const directResponse = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
          },
          mode: 'cors',
        })

        if (!directResponse.ok) {
          throw new Error(`Failed to download image: ${directResponse.status}`)
        }

        const blob = await directResponse.blob()
        setLocalImageBlob(blob)
        setObjectPreview(blob)

        return blob
      }

      const blob = await response.blob()
      setLocalImageBlob(blob)
      setObjectPreview(blob)


      return blob
    } catch (error) {
      console.error('Failed to download image for editing:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setUploadError(`Failed to download image for editing: ${errorMessage}`)
      return null
    } finally {
      setIsDownloadingImage(false)
    }
  }

  // Function to upload processed blob to Supabase
  const uploadProcessedImage = async (blob: Blob, itemId: string, imageIndex: number): Promise<string | null> => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const formData = new FormData()
      formData.append('image', blob, 'edited-image.jpg')
      formData.append('itemId', itemId)
      formData.append('imageIndex', imageIndex.toString())

      const response = await fetch(`${API_BASE_URL}/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }

      const result = await response.json()
      return result.url

    } catch (error) {
      console.error('Failed to upload processed image:', error)
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }

  // Check if we have a valid image URL
  const hasValidImage = Boolean((previewUrl || currentImageUrl) && (previewUrl || currentImageUrl).trim())
  const imageToShow = previewUrl || currentImageUrl

  const handleExplicitClose = () => {
    setIsExplicitClose(true)
    handleClose()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        // Prevent all auto-dismissal - only close via explicit button clicks
        // The dialog will be closed by calling handleClose() from buttons
      }}
    >
      <DialogContent 
        className="sm:max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col [&>button]:hidden" 
        onPointerDownOutside={(e) => {
          // Prevent closing on outside click
          e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on ESC key
          e.preventDefault()
        }}
      >
        {/* Custom close button */}
        <button
          onClick={handleExplicitClose}
          className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          disabled={isUploading || isDownloadingImage}
          type="button"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <DialogTitle>Edit Image - {itemTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!hasValidImage && (
            <div className="flex justify-center py-8">
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">No Image Available</div>
                <p className="text-sm">Please upload an image first to edit it.</p>
              </div>
            </div>
          )}

          {hasValidImage && (
            <>
              {/* Main Layout: Source (left) and Controls/Preview (right) */}
              <div className="flex gap-4 h-full">
                {/* Source Image Container - Left Side */}
                <div className="flex-1">
                  <div className="img-container" style={{
                    width: '100%',
                    height: '550px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {isDownloadingImage ? (
                      <div className="flex items-center justify-center w-full h-full">
                        <div className="text-center text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                          <p>Loading image...</p>
                        </div>
                      </div>
                    ) : previewUrl ? (
                      <img
                        ref={imageRef}
                        src={previewUrl}
                        alt="Source"
                        crossOrigin="anonymous"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <div className="text-center text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                          <p>Preparing image...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls and Preview - Right Side */}
                <div className="w-80 flex flex-col gap-4">
                  {/* Rotation Controls - Top Right */}
                  {previewUrl && !isDownloadingImage && (
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-gray-700 mb-3">Rotate</div>

                      <div className="flex gap-2 mb-4">
                        <Button
                          onClick={() => handleRotate(-90)}
                          variant="outline"
                          size="sm"
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>90° Left</span>
                        </Button>

                        <Button
                          onClick={() => handleRotate(90)}
                          variant="outline"
                          size="sm"
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <RotateCw className="h-4 w-4" />
                          <span>90° Right</span>
                        </Button>
                      </div>
                      {/* ← ADD THIS BLOCK */}
<div className="mb-4">
  <div className="text-sm font-medium text-gray-700 mb-2">
    Fine Rotate: {fineRotation}°
  </div>
<input
  type="range"
  min="0"
  max="360"
  value={fineRotation}
  onChange={(e) => handleFineRotate(Number(e.target.value))}
  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
/>
<div className="flex justify-between text-xs text-gray-500 mt-1">
  <span>0°</span>
  <span>180°</span>
  <span>360°</span>
</div>
</div>
                      <Button
                        onClick={handleCrop}
                        variant="outline"
                        className="w-full flex items-center gap-2 mb-2"
                        disabled={!previewUrl || isDownloadingImage}
                      >
                        <Crop className="h-4 w-4" />
                        Crop Selection
                      </Button>
                      
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        disabled={isUploading}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </Button>
                      <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Brightness: {(brightness - 100) * 2 > 0 ? `+${(brightness - 100) * 2}` : (brightness - 100) * 2}
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Dark</span>
                        <span>Normal</span>
                        <span>Bright</span>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* Preview - Bottom Right */}
                  {previewUrl && !isDownloadingImage && (
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex-1">
                      <div className="text-sm font-medium text-gray-700 mb-3">Preview</div>

                      <div className="img-preview" style={{
                        width: '100%',
                        height: '200px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        backgroundColor: '#f5f5f5'
                      }}>
                        {croppedImageUrl ? (
                          <img
                            src={croppedImageUrl}
                            alt="Cropped preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-400">
                            <span className="text-sm">Crop preview will appear here</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleExplicitClose}
                      variant="outline"
                      disabled={isUploading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={applyChanges}
                      disabled={isUploading || !croppedImageUrl}
                      className="flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        'Apply Changes'
                      )}
                    </Button>
                  </div>

                  {/* Error Alert */}
                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Section - Only show when not editing */}
              {!previewUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Replace Image</Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      disabled={isUploading}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div className="flex justify-between gap-2 pt-4">
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isUploading}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Image
                    </Button>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleExplicitClose} disabled={isUploading}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={!previewUrl || isUploading}
                        className="flex items-center gap-2"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isUploading ? 'Uploading...' : 'Upload & Replace'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}