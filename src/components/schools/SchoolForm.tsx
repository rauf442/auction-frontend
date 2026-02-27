// frontend/src/components/schools/SchoolForm.tsx
"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Sparkles, Loader2 } from 'lucide-react'
import { School, SchoolsAPI, AIGenerateRequest } from '@/lib/schools-api'

interface SchoolFormProps {
  school?: School;
  isEditing?: boolean;
}

export default function SchoolForm({ school, isEditing = false }: SchoolFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAIFields, setShowAIFields] = useState(false)

  const [formData, setFormData] = useState<Partial<School>>(() => {
    const defaults = {
      name: '',
      founded_year: undefined,
      closed_year: undefined,
      location: '',
      country: '',
      school_type: '',
      art_movements: '',
      specialties: '',
      description: '',
      history: '',
      notable_alumni: '',
      teaching_philosophy: '',
      programs_offered: '',
      facilities: '',
      reputation_notes: '',
      status: 'active' as const,
      is_verified: false
    };

    if (school) {
      return {
        ...defaults,
        ...school,
        // Ensure text fields are never null
        name: school.name || '',
        location: school.location || '',
        country: school.country || '',
        school_type: school.school_type || '',
        art_movements: school.art_movements || '',
        specialties: school.specialties || '',
        description: school.description || '',
        history: school.history || '',
        notable_alumni: school.notable_alumni || '',
        teaching_philosophy: school.teaching_philosophy || '',
        programs_offered: school.programs_offered || '',
        facilities: school.facilities || '',
        reputation_notes: school.reputation_notes || '',
        status: school.status || 'active',
        is_verified: school.is_verified || false
      };
    }

    return defaults;
  })

  const handleInputChange = (field: keyof School, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGenerateAI = async () => {
    if (!formData.name?.trim()) {
      setError('Please enter a school name before generating AI content')
      return
    }

    try {
      setAiLoading(true)
      setError(null)

      const request: AIGenerateRequest = {
        name: formData.name
      }

      const response = await SchoolsAPI.generateAI(request)

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
      setError('School name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (isEditing && school?.id) {
        await SchoolsAPI.updateSchool(school.id, formData)
      } else {
        await SchoolsAPI.createSchool(formData as Omit<School, 'id' | 'created_at' | 'updated_at'>)
      }

      router.push('/schools')
    } catch (err: any) {
      setError(err.message || 'Failed to save school')
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

  const schoolTypes = [
    'Art School',
    'Academy',
    'University',
    'Institute',
    'College',
    'Conservatory',
    'Workshop',
    'Atelier',
    'Studio School'
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit School' : 'Add New School'}
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
                Generate comprehensive school information using AI. Just enter the school name above and click generate.
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
                School Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter school name"
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
                Founded Year
                {getAIIndicator('founded_year')}
              </label>
              <input
                type="number"
                value={formData.founded_year || ''}
                onChange={(e) => handleInputChange('founded_year', e.target.value ? parseInt(e.target.value) : undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 1875"
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Closed Year
                {getAIIndicator('closed_year')}
              </label>
              <input
                type="number"
                value={formData.closed_year || ''}
                onChange={(e) => handleInputChange('closed_year', e.target.value ? parseInt(e.target.value) : undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Leave empty if still active"
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Location
                {getAIIndicator('location')}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Paris, London, New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Country
                {getAIIndicator('country')}
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., France, United Kingdom, United States"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                School Type
                {getAIIndicator('school_type')}
              </label>
              <select
                value={formData.school_type}
                onChange={(e) => handleInputChange('school_type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select type</option>
                {schoolTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Specialties
                {getAIIndicator('specialties')}
              </label>
              <input
                type="text"
                value={formData.specialties}
                onChange={(e) => handleInputChange('specialties', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Painting, Sculpture, Architecture"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Art Movements
              {getAIIndicator('art_movements')}
            </label>
            <input
              type="text"
              value={formData.art_movements}
              onChange={(e) => handleInputChange('art_movements', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Impressionism, Cubism, Abstract Expressionism"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Description
              {getAIIndicator('description')}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description of the school"
            />
          </div>

          {/* Extended Information (shown when AI is used or when editing) */}
          {(showAIFields || isEditing) && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-t pt-6">Extended Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  History
                  {getAIIndicator('history')}
                </label>
                <textarea
                  rows={4}
                  value={formData.history}
                  onChange={(e) => handleInputChange('history', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Detailed history of the school"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Notable Alumni
                    {getAIIndicator('notable_alumni')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notable_alumni}
                    onChange={(e) => handleInputChange('notable_alumni', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Famous artists who attended"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Programs Offered
                    {getAIIndicator('programs_offered')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.programs_offered}
                    onChange={(e) => handleInputChange('programs_offered', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Academic programs and courses"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Teaching Philosophy
                    {getAIIndicator('teaching_philosophy')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.teaching_philosophy}
                    onChange={(e) => handleInputChange('teaching_philosophy', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Educational approach and philosophy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Facilities
                    {getAIIndicator('facilities')}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.facilities}
                    onChange={(e) => handleInputChange('facilities', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Studios, galleries, libraries, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  Reputation Notes
                  {getAIIndicator('reputation_notes')}
                </label>
                <textarea
                  rows={3}
                  value={formData.reputation_notes}
                  onChange={(e) => handleInputChange('reputation_notes', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Notable achievements, rankings, recognition"
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
              {loading ? 'Saving...' : (isEditing ? 'Update School' : 'Create School')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 