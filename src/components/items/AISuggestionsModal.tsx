// frontend/src/components/items/AISuggestionsModal.tsx
"use client"

import React, { useState } from 'react'
import { X, CheckCircle, Sparkles, Loader2, AlertCircle } from 'lucide-react'

interface AISuggestion {
  title: string;
  description: string;
  category: string;
  materials: string;
  period_age: string;
  condition: string;
  low_est: number;
  high_est: number;
  start_price: number;
  reserve: number;
  artist_id: number | null;
  height_inches: string;
  width_inches: string;
  height_cm: string;
  width_cm: string;
  height_with_frame_inches: string;
  width_with_frame_inches: string;
  height_with_frame_cm: string;
  width_with_frame_cm: string;
  include_artist_description: boolean;
  include_artist_key_description: boolean;
  include_artist_biography: boolean;
  include_artist_notable_works: boolean;
  include_artist_major_exhibitions: boolean;
  include_artist_awards_honors: boolean;
  include_artist_market_value_range: boolean;
  include_artist_signature_style: boolean;
}

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AISuggestion | null;
  loading: boolean;
  error: string | null;
  onApplySuggestions: (selectedFields: Partial<AISuggestion>) => void;
}

interface FieldSelection {
  [key: string]: boolean;
}

export default function AISuggestionsModal({
  isOpen,
  onClose,
  suggestions,
  loading,
  error,
  onApplySuggestions
}: AISuggestionsModalProps) {
  const [selectedFields, setSelectedFields] = useState<FieldSelection>({})

  if (!isOpen) {
    return null
  }

  const handleFieldToggle = (fieldName: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  const handleSelectAll = () => {
    if (!suggestions) return

    // Only select fields that are actually displayed as checkboxes in the UI
    const selectableFields: (keyof AISuggestion)[] = [
      'title',
      'category',
      'materials',
      'condition',
      'period_age',
      'description',
      'low_est',
      'high_est',
      'start_price',
      'reserve',
      'height_inches',
      'width_inches',
      'height_cm',
      'width_cm',
      'include_artist_description',
      'include_artist_key_description'
    ]

    const allFields = selectableFields.reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {} as FieldSelection)

    setSelectedFields(allFields)
  }

  const handleSelectNone = () => {
    setSelectedFields({})
  }

  const handleApply = () => {
    if (!suggestions) return

    const selectedData: Partial<AISuggestion> = {}
    Object.entries(selectedFields).forEach(([key, isSelected]) => {
      if (isSelected && key in suggestions) {
        (selectedData as any)[key] = (suggestions as any)[key]
      }
    })

    onApplySuggestions(selectedData)
    onClose()
  }

  const getSelectedCount = () => {
    const selectableFields: (keyof AISuggestion)[] = [
      'title',
      'category',
      'materials',
      'condition',
      'period_age',
      'description',
      'low_est',
      'high_est',
      'start_price',
      'reserve',
      'height_inches',
      'width_inches',
      'height_cm',
      'width_cm',
      'include_artist_description',
      'include_artist_key_description'
    ]

    return selectableFields.filter(field => selectedFields[field]).length
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto w-full">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Suggestions</h2>
              <p className="text-sm text-gray-600">Select which fields to update from AI analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3 text-purple-600">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Analyzing image with AI...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {suggestions && !loading && !error && (
            <React.Fragment>
              <div className="flex items-center justify-between mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="px-3 py-1 border border-purple-300 text-purple-700 text-sm rounded hover:bg-purple-100"
                  >
                    Select None
                  </button>
                  <span className="text-sm text-purple-700">
                    {getSelectedCount()} of 16 fields selected
                  </span>
                </div>
                <button
                  onClick={handleApply}
                  disabled={getSelectedCount() === 0}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Selected ({getSelectedCount()})
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.title || false}
                          onChange={() => handleFieldToggle('title')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Title</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {suggestions.title}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.category || false}
                          onChange={() => handleFieldToggle('category')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Category</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {suggestions.category}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.materials || false}
                          onChange={() => handleFieldToggle('materials')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Materials</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {suggestions.materials}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.condition || false}
                          onChange={() => handleFieldToggle('condition')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Condition</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {suggestions.condition}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.period_age || false}
                          onChange={() => handleFieldToggle('period_age')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Period/Age</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {suggestions.period_age}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFields.description || false}
                        onChange={() => handleFieldToggle('description')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Description</span>
                    </label>
                    <div className="text-sm text-gray-900 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                      {suggestions.description}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.low_est || false}
                          onChange={() => handleFieldToggle('low_est')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Low Estimate</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        £{suggestions.low_est.toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.high_est || false}
                          onChange={() => handleFieldToggle('high_est')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">High Estimate</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        £{suggestions.high_est.toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.start_price || false}
                          onChange={() => handleFieldToggle('start_price')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Start Price</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        £{suggestions.start_price.toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.reserve || false}
                          onChange={() => handleFieldToggle('reserve')}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Reserve</span>
                      </label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        £{suggestions.reserve.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {(suggestions.height_inches || suggestions.width_inches || suggestions.height_cm || suggestions.width_cm) && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Dimensions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {suggestions.height_inches && (
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedFields.height_inches || false}
                              onChange={() => handleFieldToggle('height_inches')}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Height (inches)</span>
                          </label>
                          <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                            {suggestions.height_inches}"
                          </p>
                        </div>
                      )}

                      {suggestions.width_inches && (
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedFields.width_inches || false}
                              onChange={() => handleFieldToggle('width_inches')}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Width (inches)</span>
                          </label>
                          <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                            {suggestions.width_inches}"
                          </p>
                        </div>
                      )}

                      {suggestions.height_cm && (
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedFields.height_cm || false}
                              onChange={() => handleFieldToggle('height_cm')}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Height (cm)</span>
                          </label>
                          <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                            {suggestions.height_cm} cm
                          </p>
                        </div>
                      )}

                      {suggestions.width_cm && (
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedFields.width_cm || false}
                              onChange={() => handleFieldToggle('width_cm')}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Width (cm)</span>
                          </label>
                          <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                            {suggestions.width_cm} cm
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  )
}
