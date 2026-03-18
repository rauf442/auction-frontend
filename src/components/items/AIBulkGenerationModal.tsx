// frontend/src/components/items/AIBulkGenerationModal.tsx
"use client"

import React, { useState, useRef } from 'react'
import { toast } from 'sonner'

import { X, Upload, Eye, Trash2, Sparkles, Check, Loader, Edit3 } from 'lucide-react'
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
  const [generatedResults, setGeneratedResults] = useState<any[]>([])
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [previewingItemIndex, setPreviewingItemIndex] = useState<number | null>(null)
  // Image Edit Modal State
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
      case 'select':
        return null // Close modal
      case 'preview':
        return 'select'
      case 'generating':
        return 'preview'
      case 'complete':
        return 'preview'
      case 'edit':
        return 'complete'
      case 'preview-dialog':
        return 'complete'
      default:
        return 'select'
    }
  }

  // Handle close button - navigate to previous state or close modal
  const handleClose = () => {
    const previousStep = getPreviousStep()
    if (previousStep) {
      setCurrentStep(previousStep as any)
    } else {
      onClose()
    }
  }

  // Handle folder/file selection with support for multiple folders
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const folderMap = new Map<string, ImageFile[]>()

    // Process all selected files and group by subfolder
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return

      // Extract folder path - for folder selection, use the directory structure
      const path = (file as any).webkitRelativePath || file.name
      const pathParts = path.split('/')
      
      // For folder uploads: ParentFolder/SubfolderA/image.jpg -> use SubfolderA
      // For individual files: use auto-generated folder names
      let folderName: string
      if (pathParts.length > 2) {
        // Has parent folder and subfolder - use subfolder as inventory item
        folderName = `${pathParts[0]}/${pathParts[1]}`
      } else if (pathParts.length > 1) {
        // Direct folder upload - use folder name
        folderName = pathParts[0]
      } else {
        // Individual files - group them
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

      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, [])
      }
      folderMap.get(folderName)!.push(imageFile)
    })

    // Convert to FolderItem objects
    const folderItems: FolderItem[] = Array.from(folderMap.entries())
      .sort(([a], [b]) => {
        // Extract numbers from folder names for proper sorting
        const getNumber = (name: string) => {
          const match = name.match(/(\d+)/)
          return match ? parseInt(match[1]) : 0
        }
        return getNumber(a) - getNumber(b)
      })
      .map(([folderName, images]) => {
        // Sort images within each folder
        images.sort((a, b) => a.name.localeCompare(b.name))
        
        return {
          id: `folder-${Date.now()}-${folderName}`,
          folderName,
          images,
          generated: false
        }
      })

    setSelectedFolders(folderItems)
    setCurrentStep('preview')
  }

  // Remove entire folder (inventory item)
  const removeFolder = (folderId: string) => {
    setSelectedFolders(prev => {
      const folderToRemove = prev.find(folder => folder.id === folderId)
      if (folderToRemove) {
        // Clean up preview URLs for all images in the folder
        folderToRemove.images.forEach(img => URL.revokeObjectURL(img.preview))
      }
      
      return prev.filter(folder => folder.id !== folderId)
    })
  }

  // Remove individual image from a folder
  const removeImageFromFolder = (folderId: string, imageId: string) => {
    setSelectedFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        const imageToRemove = folder.images.find(img => img.id === imageId)
        if (imageToRemove) {
          URL.revokeObjectURL(imageToRemove.preview)
        }

        const updatedImages = folder.images.filter(img => img.id !== imageId)
        // If no images left, remove the entire folder
        if (updatedImages.length === 0) {
          return null
        }

        return {
          ...folder,
          images: updatedImages
        }
      }
      return folder
    }).filter(Boolean) as FolderItem[])
  }

  // Edit individual item
  const handleEditItem = (index: number) => {
    setEditingItemIndex(index)
    setCurrentStep('edit')
  }

  // Handle save from edit form
  const handleEditFormSave = (updatedArtwork: any) => {
    if (editingItemIndex !== null) {
      const updatedResults = [...generatedResults]
      updatedResults[editingItemIndex] = updatedArtwork
      setGeneratedResults(updatedResults)
    }
    setEditingItemIndex(null)
    setCurrentStep('complete')
  }

  // Handle cancel from edit form
  const handleEditFormCancel = () => {
    setEditingItemIndex(null)
    setCurrentStep('complete')
  }

  // Handle preview item
  const handlePreviewItem = (index: number) => {
    setPreviewingItemIndex(index)
    setCurrentStep('preview-dialog')
  }

  // Handle close preview dialog
  const handleClosePreview = () => {
    setPreviewingItemIndex(null)
    setCurrentStep('complete')
  }

  // Handle image edit
  const handleEditImage = (folderId: string, imageId: string) => {
    const folder = selectedFolders.find(f => f.id === folderId)
    const image = folder?.images.find(img => img.id === imageId)

    if (folder && image) {
      setImageEditModal({
        isOpen: true,
        imageUrl: image.preview,
        folderId,
        imageId,
        imageName: image.name
      })
    }
  }

  // Handle image update from ImageEditModal
  const handleImageUpdate = async (newImageUrl: string | null) => {
    if (!imageEditModal.folderId || !imageEditModal.imageId) return

    try {
      if (newImageUrl === null) {
        // Delete image from folder
        setSelectedFolders(prev => prev.map(folder => {
          if (folder.id === imageEditModal.folderId) {
            return {
              ...folder,
              images: folder.images.filter(img => img.id !== imageEditModal.imageId)
            }
          }
          return folder
        }))
      } else {
        // Replace image in folder
        setSelectedFolders(prev => prev.map(folder => {
          if (folder.id === imageEditModal.folderId) {
            return {
              ...folder,
              images: folder.images.map(img =>
                img.id === imageEditModal.imageId
                  ? { ...img, preview: newImageUrl }
                  : img
              )
            }
          }
          return folder
        }))
      }

      // Close modal
      setImageEditModal(prev => ({ ...prev, isOpen: false }))

    } catch (error) {
      console.error('Failed to update image:', error)
      // In a real app, you'd show an error message to the user
    }
  }

  // Generate AI data for all folders (using first image from each folder)
  const generateAIData = async () => {
    if (selectedFolders.length === 0) return

    setIsGenerating(true)
    setCurrentStep('generating')
    setGenerationProgress(0)

    const results: any[] = []

    for (let i = 0; i < selectedFolders.length; i++) {
      const folder = selectedFolders[i]
      
      // Use the first image from the folder for AI analysis
      const firstImage = folder.images[0]
      if (!firstImage) continue
      
      try {
        // Create FormData for AI analysis (using only the first image)
        const formData = new FormData()
        formData.append('image', firstImage.file)

        // Call AI analysis endpoint
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/ai-analyze`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`AI analysis failed for ${folder.folderName}`)
        }

        const aiResult = await response.json()
        
        if (aiResult.success) {
          // Create artwork data with folder information
          const artworkData = {
            ...aiResult.result,
            folder: folder.folderName,
            original_filename: firstImage.name,
            _folderImages: folder.images, // Keep all images for upload
            _primaryImageFile: firstImage.file // Primary image for display
          }

          results.push(artworkData)
          
          // Update folder status
          setSelectedFolders(prev => prev.map(f => 
            f.id === folder.id 
              ? { ...f, generated: true, aiData: artworkData }
              : f
          ))
        } else {
          console.error(`AI analysis failed for ${folder.folderName}:`, aiResult.error)
        }
      } catch (error) {
        console.error(`Error processing ${folder.folderName}:`, error)
      }

      // Update progress
      setGenerationProgress(((i + 1) / selectedFolders.length) * 100)
    }

    setGeneratedResults(results)
    setIsGenerating(false)
    setCurrentStep('complete')
  }

  // Save all generated artworks to database and sync to Google Sheets
  const saveAllArtworks = async () => {
    if (generatedResults.length === 0) return

    setIsGenerating(true)

    try {
      const savedArtworks = []

      for (const artworkData of generatedResults) {
        // Upload all images from the folder
        const imageUrls: { [key: string]: string | string[] } = {}
        
        if (artworkData._folderImages && artworkData._folderImages.length > 0) {
          const imageFormData = new FormData()
          const tempItemId = `temp_${Date.now()}_${Math.random()}`
          imageFormData.append('itemId', tempItemId)

          // Add all images from the folder
          artworkData._folderImages.forEach((image: ImageFile, index: number) => {
            const fieldName = `image_file_${index + 1}`
            imageFormData.append(fieldName, image.file)
          })

          const token = localStorage.getItem('token')
          const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/process-item-images`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: imageFormData,
          })

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json()
            if (imageResult.success && imageResult.images) {
              // Convert image result to images array format
              const imageArray: string[] = []
              Object.values(imageResult.images).forEach((url: any) => {
                if (typeof url === 'string' && url.trim()) {
                  imageArray.push(url.trim())
                }
              })
              imageUrls.images = imageArray
            }
          }
        }

        // Create artwork in database
        const artworkToSave = {
          ...artworkData,
          images: imageUrls.images || [], // Include images array
          // ID will be auto-generated by database
        }

        // Remove temporary fields
        delete artworkToSave._folderImages
        delete artworkToSave._primaryImageFile
        delete artworkToSave.folder
        delete artworkToSave.original_filename

        // Save to database
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(artworkToSave),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            savedArtworks.push(result.data)
          }
        }
      }

      // Sync to Google Sheets
      if (savedArtworks.length > 0) {
        const syncResult = await syncArtworksToGoogleSheet(savedArtworks, undefined, brand)
        if (!syncResult.success) {
          console.warn('Google Sheets sync failed:', syncResult.error)
          // Don't block the process, just log the warning
        }
      }

      // Clean up preview URLs
      selectedFolders.forEach(folder => {
        folder.images.forEach(img => URL.revokeObjectURL(img.preview))
      })

      // Complete the process
      onComplete(savedArtworks)
    } catch (error) {
      console.error('Error saving artworks:', error)
      toast.error('Error saving some artworks. Please check the console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate next available lot number
  const generateNextLotNumber = async (): Promise<string> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items?limit=1&sort_field=id&sort_direction=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.length > 0) {
          const lastLotNum = parseInt(data.data[0].id) || 0
          return (lastLotNum + 1).toString()
        }
      }
    } catch (error) {
      console.error('Error getting last lot number:', error)
    }
    
    return '1' // Default to 1 if no items exist
  }



  // Calculate total image count across all folders
  const totalImageCount = selectedFolders.reduce((total, folder) => total + folder.images.length, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Bulk Generation</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select folders to create inventory items. Each subfolder becomes one item with multiple images.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {currentStep === 'select' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select Multiple Folders
                </h3>
                <p className="text-sm text-gray-600 max-w-md">
                  Choose a parent folder containing subfolders (like ParentFolder/inv-1/, ParentFolder/inv-2/, etc.). 
                  Each subfolder becomes one inventory item, with all its images uploaded but only the first used for AI analysis.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
                {...({ webkitdirectory: "true" } as any)} // Allow folder selection
              />

              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Select Folders
                </button>
                
                <button
                  onClick={() => {
                    // Reset input to allow file selection instead of folders
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('webkitdirectory')
                      fileInputRef.current.click()
                      fileInputRef.current.setAttribute('webkitdirectory', 'true')
                    }
                  }}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Select Individual Files
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center max-w-sm">
                Supported formats: JPG, PNG, GIF. Each subfolder becomes one inventory item with multiple images. 
                First image per folder is used for AI analysis.
              </p>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Preview Selected Folders ({selectedFolders.length} items, {totalImageCount} images total)
                </h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentStep('select')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add More
                  </button>
                  <button
                    onClick={generateAIData}
                    disabled={selectedFolders.length === 0}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Details ({selectedFolders.length} items)
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-96 pr-2 space-y-4">
                {selectedFolders.map((folder) => (
                  <div key={folder.id} className="mb-6 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-800 flex items-center">
                        📁 {folder.folderName} 
                        <span className="ml-2 text-sm text-gray-600">({folder.images.length} images)</span>
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Inventory Item
                        </span>
                      </h4>
                      <button
                        onClick={() => removeFolder(folder.id)}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Remove entire folder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {folder.images.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={image.preview}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Show primary image indicator */}
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              AI Primary
                            </div>
                          )}

                          {/* Always visible action buttons */}
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <button
                              onClick={() => handleEditImage(folder.id, image.id)}
                              className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                              title="Edit image"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => removeImageFromFolder(folder.id, image.id)}
                              className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              title="Remove this image"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <p className="text-xs text-gray-600 mt-1 truncate" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      ℹ️ First image will be used for AI analysis. All images will be uploaded to storage.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'generating' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <Loader className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Generating AI Details
                </h3>
                <p className="text-sm text-gray-600">
                  Processing {selectedFolders.length} inventory items with AI analysis...
                </p>
              </div>

              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
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

              <div className="mt-6 max-w-md">
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center space-x-2">
                      {folder.generated ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader className="h-4 w-4 text-purple-600 animate-spin" />
                      )}
                      <span className={folder.generated ? 'text-green-600' : ''}>
                        📁 {folder.folderName} ({folder.images.length} images)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="h-full flex flex-col">
              {/* Compact Header with Save Button */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Check className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      AI Generation Complete
                    </h3>
                    <p className="text-sm text-gray-600">
                      {generatedResults.length} inventory items ready to save
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={saveAllArtworks}
                    disabled={isGenerating}
                    className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isGenerating && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                    Save All & Sync
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[calc(90vh-200px)] mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedResults.map((result, index) => {
                    const correspondingFolder = selectedFolders.find(f => f.aiData === result)
                    const primaryImage = correspondingFolder?.images[0]
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex space-x-3">
                          <div className="flex-shrink-0">
                            <img
                              src={primaryImage?.preview || ''}
                              alt={result.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="text-xs text-center text-gray-500 mt-1">
                              +{correspondingFolder?.images.length || 0} images
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {result.title}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {result.description}
                            </p>
                            <div className="text-xs text-gray-500 mt-1">
                              Est: £{result.low_est} - £{result.high_est}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              📁 {correspondingFolder?.folderName}
                            </div>
                            <div className="mt-2 flex space-x-2">
                              <button
                                onClick={() => handlePreviewItem(index)}
                                className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </button>
                              <button
                                onClick={() => handleEditItem(index)}
                                className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                >
                  Back to Preview
                </button>
              </div>
            </div>
          )}

          {currentStep === 'edit' && editingItemIndex !== null && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Item Details
                </h3>
                <button
                  onClick={handleEditFormCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[calc(90vh-200px)]">
                <ItemForm
                  mode="create"
                  initialData={{
                    title: generatedResults[editingItemIndex]?.title || '',
                    description: generatedResults[editingItemIndex]?.description || '',
                    low_est: generatedResults[editingItemIndex]?.low_est?.toString() || '',
                    high_est: generatedResults[editingItemIndex]?.high_est?.toString() || '',
                    start_price: generatedResults[editingItemIndex]?.start_price?.toString() || Math.round((generatedResults[editingItemIndex]?.low_est || 0) * 0.5).toString(),
                    artist_id: generatedResults[editingItemIndex]?.artist_id ? parseInt(generatedResults[editingItemIndex].artist_id.toString()) : undefined,
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
                    // Add the primary image from the corresponding folder
                    images: selectedFolders[editingItemIndex]?.images[0]?.preview ? [selectedFolders[editingItemIndex].images[0].preview] : []
                  }}
                  onSave={handleEditFormSave}
                  onCancel={handleEditFormCancel}
                />
              </div>
            </div>
          )}

          {/* Image Edit Modal */}
          <ImageEditModal
            isOpen={imageEditModal.isOpen}
            onClose={() => setImageEditModal(prev => ({ ...prev, isOpen: false }))}
            currentImageUrl={imageEditModal.imageUrl}
            imageIndex={0}
            itemTitle={imageEditModal.imageName}
            itemId={null}
            onImageUpdate={handleImageUpdate}
          />


          {currentStep === 'preview-dialog' && previewingItemIndex !== null && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Item Preview: {generatedResults[previewingItemIndex]?.title}
                </h3>
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[calc(90vh-200px)]">
                {(() => {
                  const item = generatedResults[previewingItemIndex]
                  const correspondingFolder = selectedFolders.find(f => f.aiData === item)
                  const primaryImage = correspondingFolder?.images[0]

                  return (
                    <div className="space-y-6">
                      {/* Image Preview */}
                      <div className="flex justify-center">
                        <div className="relative max-w-md">
                          <img
                            src={primaryImage?.preview || ''}
                            alt={item.title}
                            className="w-full h-auto max-h-96 object-contain rounded-lg border"
                          />
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Primary Image
                          </div>
                          <div className="text-xs text-center text-gray-500 mt-2">
                            +{correspondingFolder?.images.length || 0} total images
                          </div>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Basic Information</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Title:</span>
                                <p className="text-gray-900">{item.title}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Category:</span>
                                <p className="text-gray-900">{item.category}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Materials:</span>
                                <p className="text-gray-900">{item.materials}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Condition:</span>
                                <p className="text-gray-900">{item.condition}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Period/Age:</span>
                                <p className="text-gray-900">{item.period_age}</p>
                              </div>
                            </div>
                          </div>

                          {/* Dimensions */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Dimensions</h4>
                            <div className="space-y-2 text-sm">
                              {(item.height_inches || item.width_inches) && (
                                <div>
                                  <span className="font-medium text-gray-600">Size (inches):</span>
                                  <p className="text-gray-900">
                                    {item.height_inches || '?'} × {item.width_inches || '?'} in
                                  </p>
                                </div>
                              )}
                              {(item.height_cm || item.width_cm) && (
                                <div>
                                  <span className="font-medium text-gray-600">Size (cm):</span>
                                  <p className="text-gray-900">
                                    {item.height_cm || '?'} × {item.width_cm || '?'} cm
                                  </p>
                                </div>
                              )}
                              {(item.height_with_frame_inches || item.width_with_frame_inches) && (
                                <div>
                                  <span className="font-medium text-gray-600">With Frame (inches):</span>
                                  <p className="text-gray-900">
                                    {item.height_with_frame_inches || '?'} × {item.width_with_frame_inches || '?'} in
                                  </p>
                                </div>
                              )}
                              {item.weight && (
                                <div>
                                  <span className="font-medium text-gray-600">Weight:</span>
                                  <p className="text-gray-900">{item.weight}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {/* Pricing */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Pricing</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Low Estimate:</span>
                                <p className="text-gray-900">£{item.low_est?.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">High Estimate:</span>
                                <p className="text-gray-900">£{item.high_est?.toLocaleString()}</p>
                              </div>
                              {item.start_price && (
                                <div>
                                  <span className="font-medium text-gray-600">Starting Price:</span>
                                  <p className="text-gray-900">£{item.start_price?.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Artist Info */}
                          {item.artist_id && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Artist Information</h4>
                              <div className="text-sm">
                                <span className="font-medium text-gray-600">Artist ID:</span>
                                <p className="text-gray-900">{item.artist_id}</p>
                              </div>
                            </div>
                          )}

                          {/* Folder Info */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Source Information</h4>
                            <div className="text-sm">
                              <span className="font-medium text-gray-600">Folder:</span>
                              <p className="text-gray-900">{correspondingFolder?.folderName}</p>
                              <span className="font-medium text-gray-600">Original Filename:</span>
                              <p className="text-gray-900">{item.original_filename}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={handleClosePreview}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                        >
                          Close Preview
                        </button>
                        <button
                          onClick={() => {
                            handleClosePreview()
                            handleEditItem(previewingItemIndex)
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Edit This Item
                        </button>
                      </div>
                    </div>
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
