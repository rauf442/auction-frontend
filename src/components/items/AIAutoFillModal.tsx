// /Users/ahyconsulting04/jr-workspace/admin-zip/src/components/items/AIAutoFillModal.tsx
"use client"

import React, { useState, useRef } from 'react'
import { X, Upload, Trash2, Sparkles, Loader, Check, ChevronRight, ImageIcon, Info } from 'lucide-react'

interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
}

interface AIGeneratedData {
  title?: string
  description?: string
  low_est?: number
  high_est?: number
  start_price?: number
  reserve?: number
  artist_id?: number
  category?: string
  subcategory?: string
  materials?: string
  medium?: string
  condition?: string
  period_age?: string
  provenance?: string
  artwork_subject?: string
  signature_placement?: string
  height_inches?: string
  width_inches?: string
  height_cm?: string
  width_cm?: string
  height_with_frame_inches?: string
  width_with_frame_inches?: string
  height_with_frame_cm?: string
  width_with_frame_cm?: string
  weight?: string
}

interface AIAutoFillModalProps {
  onClose: () => void
  onFill: (data: AIGeneratedData, images: { file: File; preview: string }[]) => void
}

type Step = 'select' | 'preview' | 'generating' | 'review'

export default function AIAutoFillModal({ onClose, onFill }: AIAutoFillModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([])
  const [generatedData, setGeneratedData] = useState<AIGeneratedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = Array.from(files)[0]

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      event.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(`File "${file.name}" is too large. Maximum allowed size is 10MB.`)
      event.target.value = ''
      return
    }

    setSelectedImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.preview))
      return []
    })

    setSelectedImages([
      {
        id: `${Date.now()}-0`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      },
    ])

    setStep('preview')
    event.target.value = ''
  }

  const removeImage = (id: string) => {
    setSelectedImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return []
    })
    setStep('select')
  }

  const generateAIData = async () => {
    if (selectedImages.length === 0) return
    setError(null)
    setStep('generating')

    try {
      const formData = new FormData()
      formData.append('image', selectedImages[0].file)

      // Use your admin API URL - same as ItemForm.tsx uses
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const response = await fetch(`/api/items/ai-analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `AI analysis failed (${response.status})`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'AI analysis returned an error')
      }

      setGeneratedData(result.result)
      setStep('review')
    } catch (err: any) {
      setError(err.message || 'AI generation failed. Please try again.')
      setStep('preview')
    }
  }

  const handleFillAndClose = () => {
    if (!generatedData) return
    const imagePayload = selectedImages.map(img => ({ file: img.file, preview: img.preview }))
    onFill(generatedData, imagePayload)
  }

  const fieldLabel: Record<keyof AIGeneratedData, string> = {
    title: 'Title',
    description: 'Description',
    low_est: 'Low Estimate (£)',
    high_est: 'High Estimate (£)',
    start_price: 'Start Price (£)',
    reserve: 'Reserve Price (£)',      
  artist_id: 'Artist ID', 
    category: 'Category',
    subcategory: 'Subcategory',
    materials: 'Materials',
    medium: 'Medium',
    condition: 'Condition',
    period_age: 'Period / Age',
    provenance: 'Provenance',
    artwork_subject: 'Artwork Subject',
    signature_placement: 'Signature Placement',
    height_inches: 'Height (in)',
    width_inches: 'Width (in)',
    height_cm: 'Height (cm)',
    width_cm: 'Width (cm)',
    height_with_frame_inches: 'Height with Frame (in)',
    width_with_frame_inches: 'Width with Frame (in)',
    height_with_frame_cm: 'Height with Frame (cm)',
    width_with_frame_cm: 'Width with Frame (cm)',
    weight: 'Weight',
  }

  const filledFields = generatedData
  ? (Object.entries(generatedData) as [keyof AIGeneratedData, any][]).filter(
      ([k, v]) => v !== null && v !== undefined && v !== '' && k !== 'artist_id'
    )
  : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Auto-Fill</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload a clear photo of the artwork and let AI populate the form fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-sm">
            {(['select', 'preview', 'generating', 'review'] as Step[]).map((s, i) => {
              const labels: Record<Step, string> = {
                select: 'Select Image',
                preview: 'Review Image',
                generating: 'AI Analysis',
                review: 'Fill Form',
              }
              const stepIndex = ['select', 'preview', 'generating', 'review'].indexOf(step)
              const isDone = i < stepIndex
              const isActive = s === step

              return (
                <React.Fragment key={s}>
                  <span
                    className={`flex items-center space-x-1 font-medium ${
                      isActive
                        ? 'text-purple-600'
                        : isDone
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center border ${
                        isActive ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300 text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                    )}
                    <span>{labels[s]}</span>
                  </span>
                  {i < 3 && <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP: SELECT */}
          {step === 'select' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-gray-100 rounded-full p-6 mb-5">
                <ImageIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-2">Upload Artwork Image</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-5">
                Select a single, high-quality photo of the artwork. Our AI will analyse the image to automatically populate key details such as title, description, dimensions, category, and estimated pricing.
              </p>

              <div className="flex items-start space-x-2 max-w-sm mb-8 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-left">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <span className="font-semibold">One image per analysis.</span> AI analysis is performed on a single primary image to ensure the most accurate results. For best output, use a well-lit, unobstructed front-facing photo of the artwork.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Image
              </button>

              <p className="text-xs text-gray-400 mt-4">
                Supported formats: JPG, PNG, GIF, WebP· Maximum file size: 10MB
              </p>
              <p className="text-xs text-red-400 mt-2 font-medium">
                Note: Using AI auto-fill will overwrite any existing data in the form.
              </p>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Image selected</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    This image will be submitted for AI analysis. You can replace it if needed.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Replace
                </button>
              </div>

              <div className="flex justify-center">
                {selectedImages[0] && (
                  <div className="relative group w-64">
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-purple-400 shadow-lg">
                      <img
                        src={selectedImages[0].preview}
                        alt={selectedImages[0].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md leading-none">
                      AI Primary
                    </div>
                    <button
                      onClick={() => removeImage(selectedImages[0].id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center truncate px-1" title={selectedImages[0].name}>
                      {selectedImages[0].name}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-start space-x-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  AI-generated data is a starting point and may not be fully accurate. Please review all filled fields carefully before submitting your inventory.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
              />
            </div>
          )}

          {/* STEP: GENERATING */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="relative mb-6">
                <div className="bg-purple-100 rounded-full p-6">
                  <Sparkles className="h-12 w-12 text-purple-600" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader className="h-6 w-6 text-purple-500 animate-spin" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-2">Analysing Artwork...</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                AI is examining your image to extract title, description, dimensions, category, condition, and estimated pricing. This may take a few moments.
              </p>
              <div className="mt-6 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {/* STEP: REVIEW */}
          {step === 'review' && generatedData && (
            <div>
              <div className="flex items-center space-x-2 mb-5 p-3 bg-green-50 border border-green-200 rounded-xl">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    AI successfully filled {filledFields.length} field{filledFields.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-green-600">
                    Review the extracted data below. Click <span className="font-semibold">"Fill Form"</span> to apply it — you can edit any field afterwards.
                  </p>
                </div>
              </div>

              {selectedImages[0] && (
                <div className="flex items-start space-x-4 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <img
                    src={selectedImages[0].preview}
                    alt="Primary"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Image used for analysis</p>
                    <p className="text-sm font-medium text-gray-700">{selectedImages[0].name}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      This image will also be added to the artwork's image gallery.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {filledFields.map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-500 w-44 flex-shrink-0">
                      {fieldLabel[key] || key}
                    </span>
                    <span className="text-sm text-gray-900 text-right flex-1 ml-4 break-words">
                      {key === 'description'
                        ? <span className="text-xs leading-relaxed line-clamp-3">{String(value)}</span>
                        : String(value)
                      }
                    </span>
                  </div>
                ))}
              </div>

              {filledFields.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No fields were returned by the AI. Please try again with a clearer, higher-quality image of the artwork.
                </div>
              )}

              <div className="mt-5 flex items-start space-x-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  AI-generated data is intended as a guide and may not be fully accurate, particularly for pricing estimates and dimensions. Please verify all details before submitting your inventory.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            {step === 'preview' && (
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={generateAIData}
                disabled={selectedImages.length === 0}
                className="flex items-center px-5 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyse with AI
              </button>
            )}

            {step === 'review' && (
              <>
                <button
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFillAndClose}
                  disabled={!generatedData || filledFields.length === 0}
                  className="flex items-center px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Fill Form
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}