// frontend/src/components/galleries/GalleryForm.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Save, X, Sparkles, Loader2 } from 'lucide-react'
import { GalleriesAPI, Gallery, AIGenerateRequest } from '@/lib/galleries-api'

interface GalleryFormProps {
  galleryId?: string
  initialData?: Partial<Gallery>
  mode: 'create' | 'edit'
}

interface FormData {
  name: string
  location: string
  country: string
  founded_year: string
  director: string
  website: string
  description: string
  about: string
  specialties: string
  notable_exhibitions: string
  represented_artists: string
  address: string
  phone: string
  email: string
  gallery_type: 'commercial' | 'museum' | 'institution' | 'private' | 'cooperative'
  status: 'active' | 'inactive' | 'archived'
  is_verified: boolean
}

const initialFormData: FormData = {
  name: '',
  location: '',
  country: '',
  founded_year: '',
  director: '',
  website: '',
  description: '',
  about: '',
  specialties: '',
  notable_exhibitions: '',
  represented_artists: '',
  address: '',
  phone: '',
  email: '',
  gallery_type: 'commercial',
  status: 'active',
  is_verified: false
}

const galleryTypes = [
  { value: 'commercial', label: 'Commercial Gallery' },
  { value: 'museum', label: 'Museum' },
  { value: 'institution', label: 'Institution' },
  { value: 'private', label: 'Private Gallery' },
  { value: 'cooperative', label: 'Cooperative' }
]

const statuses = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-800' }
]

export default function GalleryForm({ galleryId, initialData, mode }: GalleryFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showAIFields, setShowAIFields] = useState(false)
  const [aiGeneratedFields, setAiGeneratedFields] = useState<{ [key: string]: boolean }>({})

  // Load gallery data if editing or from URL params
  useEffect(() => {
    if (mode === 'edit' && galleryId) {
      loadGalleryData()
    } else if (initialData) {
      populateFormData(initialData)
    } else if (mode === 'create') {
      // Check for URL params (from AI generation)
      const params = new URLSearchParams(window.location.search)
      if (params.get('name')) {
        const aiData: Partial<Gallery> = {}
        const generatedFields: { [key: string]: boolean } = {}
        
        params.forEach((value, key) => {
          if (key !== 'ai_generated_fields') {
            aiData[key as keyof Gallery] = value as any
            generatedFields[key] = true
          }
        })
        
        populateFormData(aiData)
        setAiGeneratedFields(generatedFields)
        setShowAIFields(true)
      }
    }
  }, [galleryId, mode, initialData])

  const loadGalleryData = async () => {
    if (!galleryId) return
    
    try {
      setLoading(true)
      const response = await GalleriesAPI.getGallery(galleryId)
      if (response.success) {
        populateFormData(response.data)
      } else {
        setError('Failed to load gallery data')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load gallery data')
    } finally {
      setLoading(false)
    }
  }

  const populateFormData = (data: Partial<Gallery>) => {
    setFormData({
      name: data.name || '',
      location: data.location || '',
      country: data.country || '',
      founded_year: data.founded_year?.toString() || '',
      director: data.director || '',
      website: data.website || '',
      description: data.description || '',
      about: data.about || '',
      specialties: data.specialties || '',
      notable_exhibitions: data.notable_exhibitions || '',
      represented_artists: data.represented_artists || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      gallery_type: data.gallery_type || 'commercial',
      status: data.status || 'active',
      is_verified: data.is_verified || false
    })
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setValidationErrors([])
  }

  const validateFormData = (): string[] => {
    const errors: string[] = []
    
    if (!formData.name.trim()) {
      errors.push('Gallery name is required')
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address')
    }
    
    if (formData.website && !formData.website.startsWith('http')) {
      errors.push('Website URL should start with http:// or https://')
    }
    
    return errors
  }

  const handleGenerateAI = async () => {
    if (!formData.name?.trim()) {
      setError('Please enter a gallery name before generating AI content')
      return
    }

    try {
      setAiLoading(true)
      setError(null)

      const request: AIGenerateRequest = {
        name: formData.name,
        location: formData.location || undefined
      }

      const response = await GalleriesAPI.generateAI(request)

      if (response.success) {
        // Merge AI-generated data with existing form data
        const aiData = response.data
        const generatedFields = aiData.ai_generated_fields || {}
        
        setFormData(prev => ({
          ...prev,
          location: aiData.location || prev.location,
          country: aiData.country || prev.country,
          founded_year: aiData.founded_year?.toString() || prev.founded_year,
          director: aiData.director || prev.director,
          website: aiData.website || prev.website,
          description: aiData.description || prev.description,
          about: aiData.about || prev.about,
          specialties: aiData.specialties || prev.specialties,
          notable_exhibitions: aiData.notable_exhibitions || prev.notable_exhibitions,
          represented_artists: aiData.represented_artists || prev.represented_artists,
          address: aiData.address || prev.address,
          phone: aiData.phone || prev.phone,
          email: aiData.email || prev.email,
          gallery_type: (aiData.gallery_type as any) || prev.gallery_type,
        }))
        
        setAiGeneratedFields(generatedFields)
        setShowAIFields(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI content')
    } finally {
      setAiLoading(false)
    }
  }

  const getAIIndicator = (field: string) => {
    if (aiGeneratedFields[field]) {
      return (
        <span className="inline-flex items-center ml-2" title="AI Generated">
          <Sparkles className="h-3 w-3 text-purple-500" />
        </span>
      )
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateFormData()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      const galleryData: Partial<Gallery> = {
        name: formData.name,
        location: formData.location || undefined,
        country: formData.country || undefined,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : undefined,
        director: formData.director || undefined,
        website: formData.website || undefined,
        description: formData.description || undefined,
        about: formData.about || undefined,
        specialties: formData.specialties || undefined,
        notable_exhibitions: formData.notable_exhibitions || undefined,
        represented_artists: formData.represented_artists || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        gallery_type: formData.gallery_type,
        status: formData.status,
        is_verified: formData.is_verified
      }
      
      if (mode === 'create') {
        await GalleriesAPI.createGallery(galleryData as Omit<Gallery, 'id' | 'created_at' | 'updated_at'>)
      } else if (galleryId) {
        await GalleriesAPI.updateGallery(galleryId, galleryData)
      }
      
      router.push('/galleries')
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} gallery`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/galleries')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Galleries
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Add New Gallery' : 'Edit Gallery'}
            </h1>
            {mode === 'edit' && formData.name && (
              <p className="text-gray-600 mt-1">{formData.name}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.push('/galleries')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            form="gallery-form"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Gallery'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
          <ul className="list-disc list-inside text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow">
        <form id="gallery-form" onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* AI Generation Section */}
          {mode === 'create' && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-purple-900 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  AI Generation
                </h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Generate comprehensive gallery information using AI. Enter the gallery name and optionally the location, then click generate.
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
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Type
              </label>
              <select
                value={formData.gallery_type}
                onChange={(e) => handleInputChange('gallery_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {galleryTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Location
                {getAIIndicator('location')}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Country
                {getAIIndicator('country')}
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Founded Year
                {getAIIndicator('founded_year')}
              </label>
              <input
                type="number"
                min="1000"
                max={new Date().getFullYear()}
                value={formData.founded_year}
                onChange={(e) => handleInputChange('founded_year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., 1995"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Director
                {getAIIndicator('director')}
              </label>
              <input
                type="text"
                value={formData.director}
                onChange={(e) => handleInputChange('director', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Gallery director or curator"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                Website
                {getAIIndicator('website')}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="https://www.gallery.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Description
              {getAIIndicator('description')}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Brief description of the gallery..."
            />
          </div>

          {/* Extended Information (shown when AI is used or when editing) */}
          {(showAIFields || mode === 'edit') && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-t pt-6">Extended Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  About
                  {getAIIndicator('about')}
                </label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => handleInputChange('about', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Extended information about the gallery..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Specialties
                    {getAIIndicator('specialties')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.specialties}
                    onChange={(e) => handleInputChange('specialties', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Gallery specialties and focus areas..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Represented Artists
                    {getAIIndicator('represented_artists')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.represented_artists}
                    onChange={(e) => handleInputChange('represented_artists', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Key artists represented by this gallery..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Notable Exhibitions
                  {getAIIndicator('notable_exhibitions')}
                </label>
                <textarea
                  rows={3}
                  value={formData.notable_exhibitions}
                  onChange={(e) => handleInputChange('notable_exhibitions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Notable exhibitions held by this gallery..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  Address
                  {getAIIndicator('address')}
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Full address..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Phone
                    {getAIIndicator('phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    Email
                    {getAIIndicator('email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="contact@gallery.com"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="is_verified"
                checked={formData.is_verified}
                onChange={(e) => handleInputChange('is_verified', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="is_verified" className="ml-2 text-sm text-gray-700">
                Gallery information is verified
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 