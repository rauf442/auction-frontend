// frontend/src/components/items/AIBulkGenerationModal.tsx
"use client"

import React, { useState, useRef } from 'react'
import { toast } from 'sonner'

import { X, Upload, Eye, Trash2, Sparkles, Check, Loader, Edit3, ImageIcon } from 'lucide-react'
import { syncArtworksToGoogleSheet } from '@/lib/google-sheets-api'
import { useBrand } from '@/lib/brand-context'
import ItemForm from './ItemForm'
import ImageEditModal from '@/components/ui/ImageEditModal'

interface ImageFile {
  id: string
  file: File
  preview: string
  folder: string
  name: string
  generated?: boolean
  aiData?: any
}

interface FolderItem {
  id: string
  folderName: string
  images: ImageFile[]
  generated?: boolean
  aiData?: any
  selectedImageIds?: Set<string>
}

interface GeneratedResult {
  _folderId: string  // Track by folder ID, not reference equality
  [key: string]: any
}

interface AIBulkGenerationModalProps {
  onClose: () => void
  onComplete: (results: any[]) => void
}

export default function AIBulkGenerationModal({ onClose, onComplete }: AIBulkGenerationModalProps) {
  const { brand } = useBrand()
  const [selectedFolders, setSelectedFolders] = useState<FolderItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'generating' | 'complete' | 'edit' | 'preview-dialog'>('select')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([])
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [previewingItemIndex, setPreviewingItemIndex] = useState<number | null>(null)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const [imageEditModal, setImageEditModal] = useState<{
    isOpen: boolean
    imageUrl: string
    folderId: string
    imageId: string
    imageName: string
  }>({
    isOpen: false,
    imageUrl: '',
    folderId: '',
    imageId: '',
    imageName: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get previous step for navigation
  const getPreviousStep = (): string | null => {
    switch (currentStep) {
      case 'select': return null
      case 'preview': return 'select'
      case 'generating': return 'preview'
      case 'complete': return 'preview'
      case 'edit': return 'complete'
      case 'preview-dialog': return 'complete'
      default: return 'select'
    }
  }

  const handleClose = () => {
    const previousStep = getPreviousStep()
    if (previousStep) {
      setCurrentStep(previousStep as any)
    } else {
      onClose()
    }
  }

  // ── Find folder by ID (safe, no reference equality) ──────────────────────
  const getFolderById = (folderId: string): FolderItem | undefined =>
    selectedFolders.find(f => f.id === folderId)

  // ── Toggle image selection ────────────────────────────────────────────────
  const toggleImageSelection = (folderId: string, imageId: string) => {
    setSelectedFolders(prev => prev.map(folder => {
      if (folder.id !== folderId) return folder
      const selected = new Set(folder.selectedImageIds || folder.images.map(img => img.id))
      const primaryImageId = folder.images[0]?.id
      if (selected.has(imageId)) {
        if (imageId === primaryImageId) {
          toast.error('Cannot deselect the primary image used for AI analysis')
          return folder
        }
        selected.delete(imageId)
      } else {
        selected.add(imageId)
      }
      return { ...folder, selectedImageIds: selected }
    }))
  }

  const isImageSelected = (folder: FolderItem, imageId: string): boolean => {
    if (!folder.selectedImageIds) return true
    return folder.selectedImageIds.has(imageId)
  }

  const getSelectedCount = (folder: FolderItem): number => {
    if (!folder.selectedImageIds) return folder.images.length
    return folder.selectedImageIds.size
  }

  // ── File selection ────────────────────────────────────────────────────────
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const folderMap = new Map<string, ImageFile[]>()

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return

      const path = (file as any).webkitRelativePath || file.name
      const pathParts = path.split('/')

      let folderName: string
      if (pathParts.length > 2) {
        folderName = `${pathParts[0]}/${pathParts[1]}`
      } else if (pathParts.length > 1) {
        folderName = pathParts[0]
      } else {
        folderName = `individual-item-${Math.floor(index / 1) + 1}`
      }

      const imageFile: ImageFile = {
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        folder: folderName,
        name: file.name,
        generated: false
      }

      if (!folderMap.has(folderName)) folderMap.set(folderName, [])
      folderMap.get(folderName)!.push(imageFile)
    })

    const folderItems: FolderItem[] = Array.from(folderMap.entries())
      .sort(([a], [b]) => {
        const getNumber = (name: string) => {
          const match = name.match(/(\d+)/)
          return match ? parseInt(match[1]) : 0
        }
        return getNumber(a) - getNumber(b)
      })
      .map(([folderName, images]) => {
        images.sort((a, b) => a.name.localeCompare(b.name))
        return {
          id: `folder-${Date.now()}-${folderName}`,
          folderName,
          images,
          generated: false,
          selectedImageIds: new Set(images.map(img => img.id))
        }
      })

    setSelectedFolders(folderItems)
    setCurrentStep('preview')
  }

  const removeFolder = (folderId: string) => {
    setSelectedFolders(prev => {
      const folderToRemove = prev.find(folder => folder.id === folderId)
      if (folderToRemove) folderToRemove.images.forEach(img => URL.revokeObjectURL(img.preview))
      return prev.filter(folder => folder.id !== folderId)
    })
  }

  const removeImageFromFolder = (folderId: string, imageId: string) => {
    setSelectedFolders(prev => prev.map(folder => {
      if (folder.id !== folderId) return folder
      const imageToRemove = folder.images.find(img => img.id === imageId)
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.preview)
      const updatedImages = folder.images.filter(img => img.id !== imageId)
      if (updatedImages.length === 0) return null as any
      const updatedSelected = new Set(folder.selectedImageIds || folder.images.map(i => i.id))
      updatedSelected.delete(imageId)
      return { ...folder, images: updatedImages, selectedImageIds: updatedSelected }
    }).filter(Boolean) as FolderItem[])
  }

  // ── Edit / Preview handlers ───────────────────────────────────────────────
  const handleEditItem = (index: number) => {
    setEditingItemIndex(index)
    setCurrentStep('edit')
  }

  const handleEditFormSave = (updatedArtwork: any) => {
    if (editingItemIndex !== null) {
      const updatedResults = [...generatedResults]
      // Preserve the _folderId when updating
      updatedResults[editingItemIndex] = {
        ...updatedArtwork,
        _folderId: generatedResults[editingItemIndex]._folderId
      }
      setGeneratedResults(updatedResults)
    }
    setEditingItemIndex(null)
    setCurrentStep('complete')
  }

  const handleEditFormCancel = () => {
    setEditingItemIndex(null)
    setCurrentStep('complete')
  }

  const handlePreviewItem = (index: number) => {
    setPreviewingItemIndex(index)
    setCurrentStep('preview-dialog')
  }

  const handleClosePreview = () => {
    setPreviewingItemIndex(null)
    setCurrentStep('complete')
  }

  // ── Image edit ────────────────────────────────────────────────────────────
  const handleEditImage = (folderId: string, imageId: string) => {
    const folder = selectedFolders.find(f => f.id === folderId)
    const image = folder?.images.find(img => img.id === imageId)
    if (folder && image) {
      setImageEditModal({ isOpen: true, imageUrl: image.preview, folderId, imageId, imageName: image.name })
    }
  }

  const handleImageUpdate = async (newImageUrl: string | null) => {
    if (!imageEditModal.folderId || !imageEditModal.imageId) return
    try {
      if (newImageUrl === null) {
        setSelectedFolders(prev => prev.map(folder => {
          if (folder.id !== imageEditModal.folderId) return folder
          return { ...folder, images: folder.images.filter(img => img.id !== imageEditModal.imageId) }
        }))
      } else {
        setSelectedFolders(prev => prev.map(folder => {
          if (folder.id !== imageEditModal.folderId) return folder
          return {
            ...folder,
            images: folder.images.map(img =>
              img.id === imageEditModal.imageId ? { ...img, preview: newImageUrl } : img
            )
          }
        }))
      }
      setImageEditModal(prev => ({ ...prev, isOpen: false }))
    } catch (error) {
      console.error('Failed to update image:', error)
    }
  }

  // ── AI Generation ─────────────────────────────────────────────────────────
  const generateAIData = async () => {
    if (selectedFolders.length === 0) return

    setIsGenerating(true)
    setCurrentStep('generating')
    setGenerationProgress(0)

    const results: GeneratedResult[] = []

    for (let i = 0; i < selectedFolders.length; i++) {
      const folder = selectedFolders[i]
      const firstImage = folder.images[0]
      if (!firstImage) continue

      try {
        const formData = new FormData()
        formData.append('image', firstImage.file)

        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/ai-analyze`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        })

        if (!response.ok) throw new Error(`AI analysis failed for ${folder.folderName}`)

        const aiResult = await response.json()

        if (aiResult.success) {
          const artworkData: GeneratedResult = {
            ...aiResult.result,
            _folderId: folder.id,       // ← stable ID reference
            folder: folder.folderName,
            original_filename: firstImage.name,
            _primaryImageFile: firstImage.file
          }

          results.push(artworkData)

          setSelectedFolders(prev => prev.map(f =>
            f.id === folder.id ? { ...f, generated: true, aiData: artworkData } : f
          ))
        } else {
          console.error(`AI analysis failed for ${folder.folderName}:`, aiResult.error)
        }
      } catch (error) {
        console.error(`Error processing ${folder.folderName}:`, error)
      }

      setGenerationProgress(((i + 1) / selectedFolders.length) * 100)
    }

    setGeneratedResults(results)
    setIsGenerating(false)
    setCurrentStep('complete')
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveAllClick = () => setShowConfirmDialog(true)

  const saveAllArtworks = async () => {
    setShowConfirmDialog(false)
    if (generatedResults.length === 0) return

    setIsGenerating(true)

    try {
      const savedArtworks = []

      for (const artworkData of generatedResults) {
        // ← Use stable _folderId instead of reference equality
        const correspondingFolder = getFolderById(artworkData._folderId)

        const imagesToUpload = correspondingFolder
          ? correspondingFolder.images.filter(img => isImageSelected(correspondingFolder, img.id))
          : []

        const imageUrls: { [key: string]: string | string[] } = {}

        if (imagesToUpload.length > 0) {
          const imageFormData = new FormData()
          const tempItemId = `temp_${Date.now()}_${Math.random()}`
          imageFormData.append('itemId', tempItemId)

          imagesToUpload.forEach((image: ImageFile, index: number) => {
            imageFormData.append(`image_file_${index + 1}`, image.file)
          })

          const token = localStorage.getItem('token')
          const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/process-item-images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imageFormData,
          })

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json()
            if (imageResult.success && imageResult.images) {
              const imageArray: string[] = []
              Object.values(imageResult.images).forEach((url: any) => {
                if (typeof url === 'string' && url.trim()) imageArray.push(url.trim())
              })
              imageUrls.images = imageArray
            }
          }
        }

        // Strip internal tracking fields via destructuring — avoids TypeScript delete errors
        const {
          _folderId: _f,
          _primaryImageFile: _p,
          folder: _folder,
          original_filename: _orig,
          ...rest
        } = artworkData as any
        const artworkToSave = { ...rest, images: imageUrls.images || [] }

        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(artworkToSave),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) savedArtworks.push(result.data)
        }
      }

      if (savedArtworks.length > 0) {
        const syncResult = await syncArtworksToGoogleSheet(savedArtworks, undefined, brand)
        if (!syncResult.success) console.warn('Google Sheets sync failed:', syncResult.error)
      }

      selectedFolders.forEach(folder => {
        folder.images.forEach(img => URL.revokeObjectURL(img.preview))
      })

      onComplete(savedArtworks)
    } catch (error) {
      console.error('Error saving artworks:', error)
      toast.error('Error saving some artworks. Please check the console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  const totalImageCount = selectedFolders.reduce((total, folder) => total + folder.images.length, 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-auto flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Bulk Generation</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Each subfolder becomes one inventory item with multiple images
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* ── Confirmation Dialog ───────────────────────────────────────────── */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Save All</h3>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">
                You're about to save{' '}
                <span className="font-semibold text-gray-900">
                  {generatedResults.length} inventory item{generatedResults.length !== 1 ? 's' : ''}
                </span>.
              </p>

              {/* Per-item image summary */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Image Summary per Item</p>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                  {generatedResults.map((result, index) => {
                    const folder = getFolderById(result._folderId)
                    const selectedCount = folder ? getSelectedCount(folder) : 0
                    const totalCount = folder?.images.length || 0
                    const skipped = totalCount - selectedCount
                    return (
                      <div key={index} className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-gray-700 truncate max-w-[200px]">
                          {result.title || `Item ${index + 1}`}
                        </span>
                        <span className={`text-xs font-medium shrink-0 ml-2 ${skipped > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {selectedCount}/{totalCount} images{skipped > 0 ? ` (${skipped} skipped)` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {generatedResults.some(result => {
                const folder = getFolderById(result._folderId)
                return folder && getSelectedCount(folder) < folder.images.length
              }) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-700">
                  <strong>Do you want to add the remaining images to this inventory?</strong>
                </div>
              )}


              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAllArtworks}
                  className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                >
                  Yes, Save All &amp; Sync
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 py-5">

          {/* ── SELECT STEP ─────────────────────────────────────────────────── */}
          {currentStep === 'select' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Folders or Files</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Choose a parent folder containing subfolders. Each subfolder becomes one inventory item — all images are uploaded, but only the first is used for AI analysis.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
                {...({ webkitdirectory: "true" } as any)}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Folders
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('webkitdirectory')
                      fileInputRef.current.click()
                      fileInputRef.current.setAttribute('webkitdirectory', 'true')
                    }
                  }}
                  className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Individual Files
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-5 text-center max-w-xs">
                Supported: JPG, PNG, GIF. First image per folder is used for AI analysis.
              </p>
            </div>
          )}

          {/* ── PREVIEW STEP ─────────────────────────────────────────────────── */}
          {currentStep === 'preview' && (
            <div className="h-full flex flex-col" style={{ maxHeight: 'calc(92vh - 130px)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedFolders.length} item{selectedFolders.length !== 1 ? 's' : ''} selected
                  </h3>
                  <p className="text-xs text-gray-500">{totalImageCount} images total</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Add More
                  </button>
                  <button
                    onClick={generateAIData}
                    disabled={selectedFolders.length === 0}
                    className="flex items-center px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate AI Details ({selectedFolders.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {selectedFolders.map((folder) => (
                  <div key={folder.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">📁</span>
                        <span className="font-medium text-gray-800 text-sm truncate">{folder.folderName}</span>
                        <span className="text-xs text-gray-500 shrink-0">({folder.images.length} images)</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Item</span>
                      </div>
                      <button
                        onClick={() => removeFolder(folder.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remove folder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
                      {folder.images.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            <img src={image.preview} alt={image.name} className="w-full h-full object-cover" />
                          </div>
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white rounded px-1 py-0.5" style={{ fontSize: '9px' }}>
                              AI
                            </div>
                          )}
                          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditImage(folder.id, image.id)}
                              className="p-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                              title="Edit image"
                            >
                              <Edit3 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => removeImageFromFolder(folder.id, image.id)}
                              className="p-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                              title="Remove"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      First image used for AI analysis · All images uploaded to storage
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GENERATING STEP ──────────────────────────────────────────────── */}
          {currentStep === 'generating' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Generating AI Details</h3>
                <p className="text-sm text-gray-500">
                  Analysing {selectedFolders.length} items…
                </p>
              </div>

              <div className="w-full max-w-sm mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Progress</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>

              <div className="w-full max-w-sm space-y-1.5">
                {selectedFolders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-2 text-sm">
                    {folder.generated
                      ? <Check className="h-4 w-4 text-green-500 shrink-0" />
                      : <Loader className="h-4 w-4 text-purple-500 animate-spin shrink-0" />}
                    <span className={`truncate ${folder.generated ? 'text-green-600' : 'text-gray-600'}`}>
                      📁 {folder.folderName}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">({folder.images.length} img)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COMPLETE STEP ────────────────────────────────────────────────── */}
          {currentStep === 'complete' && (
            <div className="h-full flex flex-col" style={{ maxHeight: 'calc(92vh - 130px)' }}>
              {/* Sub-header */}
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Generation Complete</p>
                  <p className="text-xs text-gray-500">{generatedResults.length} items ready · click images to select/deselect</p>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {generatedResults.map((result, index) => {
                  const correspondingFolder = getFolderById(result._folderId)
                  const selectedCount = correspondingFolder ? getSelectedCount(correspondingFolder) : 0
                  const totalCount = correspondingFolder?.images.length || 0

                  return (
                    <div key={index} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      {/* Card top row */}
                      <div className="flex items-start gap-4 p-5 pb-4">
                        {/* Primary image thumbnail - bigger */}
                        {correspondingFolder?.images[0] && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100">
                            <img
                              src={correspondingFolder.images[0].preview}
                              alt="primary"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 text-base truncate">{result.title}</h4>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-3">{result.description}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handlePreviewItem(index)}
                                className="flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Preview
                              </button>
                              <button
                                onClick={() => handleEditItem(index)}
                                className="flex items-center px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm text-gray-600 font-medium">Est: £{result.low_est?.toLocaleString()} – £{result.high_est?.toLocaleString()}</span>
                            {correspondingFolder && (
                              <span className="text-xs text-blue-600 truncate">📁 {correspondingFolder.folderName}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Image selection strip */}
                      {correspondingFolder && correspondingFolder.images.length > 0 && (
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-xs font-medium text-gray-600">Images to save</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              selectedCount === totalCount ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {selectedCount}/{totalCount} selected
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {correspondingFolder.images.map((image, imgIndex) => {
                              const selected = isImageSelected(correspondingFolder, image.id)
                              const isPrimary = imgIndex === 0
                              return (
                                <div
                                  key={image.id}
                                  onClick={() => toggleImageSelection(correspondingFolder.id, image.id)}
                                  title={isPrimary ? 'Primary image (always included)' : selected ? 'Click to deselect' : 'Click to select'}
                                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                    selected
                                      ? isPrimary ? 'border-green-500' : 'border-blue-400'
                                      : 'border-gray-200 opacity-40 grayscale'
                                  }`}
                                  style={{ width: 100, height: 100 }}
                                >
                                  <img src={image.preview} alt={image.name} className="w-full h-full object-cover" />

                                  {/* Primary badge */}
                                  {isPrimary && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-center" style={{ fontSize: '8px', padding: '1px 0' }}>
                                      AI
                                    </div>
                                  )}

                                  {/* Checkbox dot */}
                                  <div className={`absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                    selected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-400'
                                  }`}>
                                    {selected && <Check className="h-2 w-2 text-white" />}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <p className="text-xs text-gray-400 mt-1.5">
                            Click images to select or deselect · Primary image always included
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100">
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Back to Preview
                </button>
                <button
                  onClick={handleSaveAllClick}
                  disabled={isGenerating}
                  className="flex items-center px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {isGenerating && <Loader className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Save All &amp; Sync
                </button>
              </div>
            </div>
          )}

          {/* ── EDIT STEP ────────────────────────────────────────────────────── */}
          {currentStep === 'edit' && editingItemIndex !== null && (
            <div className="h-full flex flex-col" style={{ maxHeight: 'calc(92vh - 130px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Edit Item Details</h3>
                <button onClick={handleEditFormCancel} className="text-sm text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <ItemForm
                  mode="create"
                  initialData={{
                    title: generatedResults[editingItemIndex]?.title || '',
                    description: generatedResults[editingItemIndex]?.description || '',
                    low_est: generatedResults[editingItemIndex]?.low_est?.toString() || '',
                    high_est: generatedResults[editingItemIndex]?.high_est?.toString() || '',
                    start_price: generatedResults[editingItemIndex]?.start_price?.toString() ||
                      Math.round((generatedResults[editingItemIndex]?.low_est || 0) * 0.5).toString(),
                    artist_id: generatedResults[editingItemIndex]?.artist_id
                      ? parseInt(generatedResults[editingItemIndex].artist_id.toString())
                      : undefined,
                    height_inches: generatedResults[editingItemIndex]?.height_inches || '',
                    width_inches: generatedResults[editingItemIndex]?.width_inches || '',
                    height_cm: generatedResults[editingItemIndex]?.height_cm || '',
                    width_cm: generatedResults[editingItemIndex]?.width_cm || '',
                    height_with_frame_inches: generatedResults[editingItemIndex]?.height_with_frame_inches || '',
                    width_with_frame_inches: generatedResults[editingItemIndex]?.width_with_frame_inches || '',
                    height_with_frame_cm: generatedResults[editingItemIndex]?.height_with_frame_cm || '',
                    width_with_frame_cm: generatedResults[editingItemIndex]?.width_with_frame_cm || '',
                    weight: generatedResults[editingItemIndex]?.weight || '',
                    materials: generatedResults[editingItemIndex]?.materials || '',
                    condition: generatedResults[editingItemIndex]?.condition || '',
                    category: generatedResults[editingItemIndex]?.category || '',
                    status: 'draft',
                    images: (() => {
                      const folder = getFolderById(generatedResults[editingItemIndex]?._folderId)
                      return folder?.images[0]?.preview ? [folder.images[0].preview] : []
                    })()
                  }}
                  onSave={handleEditFormSave}
                  onCancel={handleEditFormCancel}
                />
              </div>
            </div>
          )}

          {/* ── IMAGE EDIT MODAL ─────────────────────────────────────────────── */}
          <ImageEditModal
            isOpen={imageEditModal.isOpen}
            onClose={() => setImageEditModal(prev => ({ ...prev, isOpen: false }))}
            currentImageUrl={imageEditModal.imageUrl}
            imageIndex={0}
            itemTitle={imageEditModal.imageName}
            itemId={null}
            onImageUpdate={handleImageUpdate}
          />

          {/* ── PREVIEW DIALOG STEP ──────────────────────────────────────────── */}
          {currentStep === 'preview-dialog' && previewingItemIndex !== null && (
            <div className="h-full flex flex-col" style={{ maxHeight: 'calc(92vh - 130px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 truncate mr-4">
                  {generatedResults[previewingItemIndex]?.title}
                </h3>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { handleClosePreview(); handleEditItem(previewingItemIndex) }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button onClick={handleClosePreview} className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5">
                {(() => {
                  const item = generatedResults[previewingItemIndex]
                  const correspondingFolder = getFolderById(item._folderId)

                  return (
                    <>
                      {/* All images */}
                      {correspondingFolder && correspondingFolder.images.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            All Images ({correspondingFolder.images.length})
                          </h4>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {correspondingFolder.images.map((image, imgIndex) => (
                              <div key={image.id} className="relative">
                                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                  <img src={image.preview} alt={image.name} className="w-full h-full object-cover" />
                                </div>
                                {imgIndex === 0 && (
                                  <div className="absolute top-1 left-1 bg-green-500 text-white rounded px-1 py-0.5" style={{ fontSize: '9px' }}>
                                    AI
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-4">
                          <section>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Basic Information</h4>
                            <dl className="space-y-1.5 text-sm">
                              {[
                                ['Title', item.title],
                                ['Category', item.category],
                                ['Materials', item.materials],
                                ['Condition', item.condition],
                                ['Period / Age', item.period_age],
                              ].filter(([, v]) => v).map(([label, val]) => (
                                <div key={label as string}>
                                  <dt className="text-xs text-gray-500">{label}</dt>
                                  <dd className="text-gray-900">{val}</dd>
                                </div>
                              ))}
                            </dl>
                          </section>

                          <section>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dimensions</h4>
                            <dl className="space-y-1.5 text-sm">
                              {(item.height_inches || item.width_inches) && (
                                <div>
                                  <dt className="text-xs text-gray-500">Size (inches)</dt>
                                  <dd className="text-gray-900">{item.height_inches || '?'} × {item.width_inches || '?'} in</dd>
                                </div>
                              )}
                              {(item.height_cm || item.width_cm) && (
                                <div>
                                  <dt className="text-xs text-gray-500">Size (cm)</dt>
                                  <dd className="text-gray-900">{item.height_cm || '?'} × {item.width_cm || '?'} cm</dd>
                                </div>
                              )}
                              {item.weight && (
                                <div>
                                  <dt className="text-xs text-gray-500">Weight</dt>
                                  <dd className="text-gray-900">{item.weight}</dd>
                                </div>
                              )}
                            </dl>
                          </section>
                        </div>

                        <div className="space-y-4">
                          <section>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pricing</h4>
                            <dl className="space-y-1.5 text-sm">
                              <div>
                                <dt className="text-xs text-gray-500">Estimate</dt>
                                <dd className="text-gray-900 font-medium">£{item.low_est?.toLocaleString()} – £{item.high_est?.toLocaleString()}</dd>
                              </div>
                              {item.start_price && (
                                <div>
                                  <dt className="text-xs text-gray-500">Starting Price</dt>
                                  <dd className="text-gray-900">£{item.start_price?.toLocaleString()}</dd>
                                </div>
                              )}
                            </dl>
                          </section>

                          <section>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Source</h4>
                            <dl className="space-y-1.5 text-sm">
                              <div>
                                <dt className="text-xs text-gray-500">Folder</dt>
                                <dd className="text-gray-900">{correspondingFolder?.folderName}</dd>
                              </div>
                              <div>
                                <dt className="text-xs text-gray-500">Original File</dt>
                                <dd className="text-gray-900">{item.original_filename}</dd>
                              </div>
                            </dl>
                          </section>
                        </div>
                      </div>

                      {/* Description */}
                      <section>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
                        </div>
                      </section>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}