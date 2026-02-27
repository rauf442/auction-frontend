// frontend/src/components/items/common/DimensionsSection.tsx
"use client"

import React from 'react'

interface DimensionsSectionProps {
  heightInches: string
  widthInches: string
  heightCm: string
  widthCm: string
  heightWithFrameInches: string
  widthWithFrameInches: string
  heightWithFrameCm: string
  widthWithFrameCm: string
  weight: string
  onFieldChange: (field: string, value: string | boolean) => void
}

// Utility functions for dimension conversion
const convertInchesToCm = (inchStr: string): string => {
  // Parse dimensions like "24 x 36" or "24" x 36"" and convert to cm
  const converted = inchStr.replace(/(\d+(?:\.\d+)?)\s*[\"']?\s*/g, (match, number) => {
    const inches = parseFloat(number)
    const cm = Math.round(inches * 2.54 * 10) / 10 // Round to 1 decimal place
    return cm.toString()
  })
  return converted.replace(/x/g, 'x').replace(/"/g, '').replace(/'/g, '') + ' cm'
}

const convertCmToInches = (cmStr: string): string => {
  // Parse dimensions like "61 x 91 cm" and convert to inches
  const converted = cmStr.replace(/(\d+(?:\.\d+)?)\s*/g, (match, number) => {
    const cm = parseFloat(number)
    const inches = Math.round(cm / 2.54 * 10) / 10 // Round to 1 decimal place
    return inches.toString()
  })
  return converted.replace(/cm/g, '').replace(/x/g, 'x').trim() + '"'
}

export default function DimensionsSection({
  heightInches,
  widthInches,
  heightCm,
  widthCm,
  heightWithFrameInches,
  widthWithFrameInches,
  heightWithFrameCm,
  widthWithFrameCm,
  weight,
  onFieldChange
}: DimensionsSectionProps) {

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Height
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inches</label>
            <input
              type="number"
              step="0.1"
              value={heightInches}
              onChange={(e) => {
                onFieldChange('height_inches', e.target.value)
                // Auto-convert to cm
                if (e.target.value) {
                  const cmValue = convertInchesToCm(e.target.value)
                  if (cmValue) {
                    onFieldChange('height_cm', cmValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder='e.g., 24"'
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
            <input
              type="text"
              value={heightCm}
              onChange={(e) => {
                onFieldChange('height_cm', e.target.value)
                // Auto-convert to inches
                if (e.target.value) {
                  const inchValue = convertCmToInches(e.target.value)
                  if (inchValue) {
                    onFieldChange('height_inches', inchValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder="e.g., 61 cm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Width
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inches</label>
            <input
              type="text"
              value={widthInches}
              onChange={(e) => {
                onFieldChange('width_inches', e.target.value)
                // Auto-convert to cm
                if (e.target.value) {
                  const cmValue = convertInchesToCm(e.target.value)
                  if (cmValue) {
                    onFieldChange('width_cm', cmValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder='e.g., 36"'
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
            <input
              type="text"
              value={widthCm}
              onChange={(e) => {
                onFieldChange('width_cm', e.target.value)
                // Auto-convert to inches
                if (e.target.value) {
                  const inchValue = convertCmToInches(e.target.value)
                  if (inchValue) {
                    onFieldChange('width_inches', inchValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder="e.g., 91 cm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Height with Frame
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inches</label>
            <input
              type="text"
              value={heightWithFrameInches}
              onChange={(e) => {
                onFieldChange('height_with_frame_inches', e.target.value)
                // Auto-convert to cm
                if (e.target.value) {
                  const cmValue = convertInchesToCm(e.target.value)
                  if (cmValue) {
                    onFieldChange('height_with_frame_cm', cmValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder='e.g., 26"'
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
            <input
              type="text"
              value={heightWithFrameCm}
              onChange={(e) => {
                onFieldChange('height_with_frame_cm', e.target.value)
                // Auto-convert to inches
                if (e.target.value) {
                  const inchValue = convertCmToInches(e.target.value)
                  if (inchValue) {
                    onFieldChange('height_with_frame_inches', inchValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder="e.g., 66 cm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Width with Frame
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inches</label>
            <input
              type="text"
              value={widthWithFrameInches}
              onChange={(e) => {
                onFieldChange('width_with_frame_inches', e.target.value)
                // Auto-convert to cm
                if (e.target.value) {
                  const cmValue = convertInchesToCm(e.target.value)
                  if (cmValue) {
                    onFieldChange('width_with_frame_cm', cmValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder='e.g., 38"'
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
            <input
              type="text"
              value={widthWithFrameCm}
              onChange={(e) => {
                onFieldChange('width_with_frame_cm', e.target.value)
                // Auto-convert to inches
                if (e.target.value) {
                  const inchValue = convertCmToInches(e.target.value)
                  if (inchValue) {
                    onFieldChange('width_with_frame_inches', inchValue)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
              placeholder="e.g., 97 cm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight
          </label>
          <input
            type="text"
            value={weight}
            onChange={(e) => onFieldChange('weight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
            placeholder="e.g., 2.5kg"
          />
        </div>
      </div>
    </div>
  )
}
