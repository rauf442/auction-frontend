// frontend/admin/src/components/ui/ImageEditModal.tsx
"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, Trash2, Loader2, RotateCw, RotateCcw, RefreshCw } from 'lucide-react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Helper functions for Google Drive URLs
const isDriveUrl = (url: string): boolean => {
  return Boolean(url && (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com')
  ))
}

const extractDriveFileId = (url: string): string | null => {
  if (!url) return null
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/uc\?export=view&id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }
  return null
}

// Get cropped canvas from image
const getCroppedCanvas = (
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  rotation: number = 0,
  brightness: number = 100
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  // First create a rotated version of the full image
  const rotatedCanvas = document.createElement('canvas')
  const rotatedCtx = rotatedCanvas.getContext('2d')
  if (!rotatedCtx) throw new Error('No 2d context')

  const radians = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))

  rotatedCanvas.width = image.naturalWidth * cos + image.naturalHeight * sin
  rotatedCanvas.height = image.naturalWidth * sin + image.naturalHeight * cos

  rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2)
  rotatedCtx.rotate(radians)
  rotatedCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

  // Scale factor between displayed size and natural size
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  // Now crop from the rotated canvas
  canvas.width = pixelCrop.width * scaleX
  canvas.height = pixelCrop.height * scaleY

  // The rotated canvas is bigger than original - offset to match
  const offsetX = (rotatedCanvas.width - image.naturalWidth) / 2
  const offsetY = (rotatedCanvas.height - image.naturalHeight) / 2

  ctx.drawImage(
    rotatedCanvas,
    pixelCrop.x * scaleX + offsetX,
    pixelCrop.y * scaleY + offsetY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  )

  // Apply brightness
  if (brightness !== 100) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (tempCtx) {
      tempCtx.filter = `brightness(${brightness}%)`
      tempCtx.drawImage(canvas, 0, 0)
      return tempCanvas
    }
  }

  return canvas
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 100 }, mediaWidth / mediaHeight, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  )
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
  : 'http://localhost:3001/api'

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

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
  const [localImageBlob, setLocalImageBlob] = useState<Blob | null>(null)
  const [isDownloadingImage, setIsDownloadingImage] = useState(false)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('')
  const [brightness, setBrightness] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [fineRotation, setFineRotation] = useState(0)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen && currentImageUrl && !localImageBlob && !previewUrl) {
      downloadImageForEditing()
    }
  }, [isOpen, currentImageUrl])

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null)
      setLocalImageBlob(null)
      setUploadError(null)
      setIsDownloadingImage(false)
      setCroppedImageUrl('')
      setRotation(0)
      setFineRotation(0)
      setBrightness(100)
      setCrop(undefined)
      setCompletedCrop(undefined)
    }
  }, [isOpen])

  const setObjectPreview = (blob: Blob) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(blob)
    objectUrlRef.current = objectUrl
    setPreviewUrl(objectUrl)
  }

  const downloadImageForEditing = async (): Promise<Blob | null> => {
    if (!currentImageUrl) return null
    try {
      setIsDownloadingImage(true)
      setUploadError(null)

      if (currentImageUrl.startsWith('data:') || currentImageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(currentImageUrl)
          const blob = await response.blob()
          setLocalImageBlob(blob)
          setPreviewUrl(currentImageUrl)
          return blob
        } catch (error) {
          console.warn('Failed to process local URL:', error)
        }
      }

      let imageUrl = currentImageUrl
      if (isDriveUrl(currentImageUrl)) {
        const fileId = extractDriveFileId(currentImageUrl)
        if (fileId) imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`
        else throw new Error('Could not extract Google Drive file ID')
      }

      const proxyUrl = `${API_BASE_URL}/images/proxy?url=${encodeURIComponent(imageUrl)}`
      const response = await fetch(proxyUrl, {
        headers: { 'Accept': 'image/*', 'Authorization': `Bearer ${getAuthToken()}` }
      })

      if (!response.ok) {
        const directResponse = await fetch(imageUrl, { headers: { 'Accept': 'image/*' }, mode: 'cors' })
        if (!directResponse.ok) throw new Error(`Failed to download image: ${directResponse.status}`)
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setUploadError(`Failed to download image: ${errorMessage}`)
      return null
    } finally {
      setIsDownloadingImage(false)
    }
  }

const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const { width, height } = e.currentTarget
  setCrop({
    unit: 'px',
    x: 0,
    y: 0,
    width: width,
    height: height,
  })
}

// Auto-update preview when brightness, rotation or crop changes - REALTIME
useEffect(() => {
  if (!crop || !imgRef.current) return
  
  // Only process if we have actual dimensions
  if (crop.width === 0 || crop.height === 0) return
  
  try {
    const canvas = getCroppedCanvas(imgRef.current, crop as PixelCrop, rotation, brightness)
    setCroppedImageUrl(canvas.toDataURL('image/jpeg', 0.9))
  } catch (error) {
    console.error('Auto preview failed:', error)
  }
}, [crop, brightness, rotation])

  const handleRotate = (degrees: number) => {
    setRotation(prev => prev + degrees)
  }

  const handleFineRotate = (value: number) => {
    setFineRotation(value)
    setRotation(value)
  }

  const handleReset = () => {
    setRotation(0)
    setFineRotation(0)
    setBrightness(100)
    setCroppedImageUrl('')
    if (imgRef.current) {
      const { naturalWidth: width, naturalHeight: height } = imgRef.current
      setCrop(centerAspectCrop(width, height))
    }
  }

  const applyChanges = async () => {
    if (!completedCrop || !imgRef.current) return
    try {
      setIsUploading(true)
      setUploadError(null)
      const canvas = getCroppedCanvas(imgRef.current, completedCrop, rotation, brightness)
      const base64Url = canvas.toDataURL('image/jpeg', 0.9)
      await onImageUpdate(base64Url, imageIndex)
      onClose()
    } catch (error) {
      setUploadError('Failed to apply changes. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setUploadError('Please select a valid image file'); return }
    if (file.size > 10 * 1024 * 1024) { setUploadError('Image file size must be less than 10MB'); return }
    setUploadError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setCroppedImageUrl('')
      setRotation(0)
      setFineRotation(0)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) { setUploadError('Please select an image to upload'); return }
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
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
    } catch (error) {
      setUploadError('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this image from "${itemTitle}"?`)) return
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

  const handleClose = () => {
    setPreviewUrl(null)
    setUploadError(null)
    setLocalImageBlob(null)
    setIsDownloadingImage(false)
    setCroppedImageUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const hasValidImage = Boolean((previewUrl || currentImageUrl)?.trim())

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <button
          onClick={handleClose}
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
            <div className="flex justify-center py-8 text-center text-gray-500">
              <div>
                <div className="text-lg font-medium mb-2">No Image Available</div>
                <p className="text-sm">Please upload an image first to edit it.</p>
              </div>
            </div>
          )}

          {hasValidImage && (
            <>
              <div className="flex gap-4">
                {/* Crop Area - Left */}
                <div className="flex-1">
                  <div style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '550px' }}>
                    {isDownloadingImage ? (
                      <div className="flex items-center justify-center w-full h-64 text-center text-gray-500">
                        <div>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                          <p>Loading image...</p>
                        </div>
                      </div>
                    ) : previewUrl ? (
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        style={{ display: 'block', maxHeight: '550px' }}
                      >
                        <img
                          ref={imgRef}
                          src={previewUrl}
                          alt="Source"
                          crossOrigin="anonymous"
                          onLoad={onImageLoad}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '550px',
                            display: 'block',
                            margin: '0 auto',
                            transform: `rotate(${rotation}deg)`,
                            filter: `brightness(${brightness}%)`,
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </ReactCrop>
                    ) : (
                      <div className="flex items-center justify-center w-full h-64 text-center text-gray-500">
                        <div>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                          <p>Preparing image...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls - Right */}
                <div className="w-80 flex flex-col gap-4">
                  {previewUrl && !isDownloadingImage && (
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-gray-700 mb-3">Rotate</div>
                      <div className="flex gap-2 mb-4">
                        <Button onClick={() => handleRotate(-90)} variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-2">
                          <RotateCcw className="h-4 w-4" /><span>90° Left</span>
                        </Button>
                        <Button onClick={() => handleRotate(90)} variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-2">
                          <RotateCw className="h-4 w-4" /><span>90° Right</span>
                        </Button>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Fine Rotate: {fineRotation}°</div>
                        <input type="range" min={0} max={360} value={fineRotation}
  onChange={(e) => handleFineRotate(Number(e.target.value))}
  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
<div className="flex justify-between text-xs text-gray-500 mt-1">
  <span>0°</span><span>180°</span><span>360°</span>
</div>
                      </div>

                      <Button onClick={handleReset} variant="outline" className="w-full flex items-center gap-2" disabled={isUploading}>
                        <RefreshCw className="h-4 w-4" />Reset
                      </Button>

                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Brightness: {(brightness - 100) * 2 > 0 ? `+${(brightness - 100) * 2}` : (brightness - 100) * 2}
                        </div>
                        <input type="range" min={50} max={150} value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Dark</span><span>Normal</span><span>Bright</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {previewUrl && !isDownloadingImage && (
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex-1">
                      <div className="text-sm font-medium text-gray-700 mb-3">Preview</div>
                      <div style={{ width: '100%', height: '200px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                        {croppedImageUrl ? (
                          <img src={croppedImageUrl} alt="Cropped preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-400">
                            <span className="text-sm">Click "Preview Crop" to see result</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={handleClose} variant="outline" disabled={isUploading} className="flex-1">Cancel</Button>
                    <Button
                      onClick={applyChanges}
                      disabled={isUploading || !completedCrop}
                      className="flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" />Applying...</> : 'Apply Changes'}
                    </Button>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{uploadError}</div>
                  )}
                </div>
              </div>

              {/* Upload Section */}
              {!previewUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Replace Image</Label>
                    <input
                      id="image-upload" type="file" accept="image/*"
                      onChange={handleFileSelect} ref={fileInputRef} disabled={isUploading}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-between gap-2 pt-4">
                    <Button variant="destructive" onClick={handleDelete} disabled={isUploading} className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />Delete Image
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
                      <Button onClick={handleUpload} disabled={!previewUrl || isUploading} className="flex items-center gap-2">
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
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