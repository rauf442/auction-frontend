// frontend/src/components/items/common/ArtworkDescriptionSection.tsx
"use client"

import React from 'react'
import { Artist } from '@/lib/artists-api'

interface ArtworkDescriptionSectionProps {
  title: string
  description: string
  artistId: string
  artists: Artist[]
  includeArtistDescription: boolean
  includeArtistKeyDescription: boolean
  includeArtistBiography: boolean
  includeArtistNotableWorks: boolean
  includeArtistMajorExhibitions: boolean
  includeArtistAwardsHonors: boolean
  includeArtistMarketValueRange: boolean
  includeArtistSignatureStyle: boolean
  conditionReport: string
  onFieldChange: (field: string, value: string | boolean) => void
  uniqueIdPrefix?: string // For unique IDs when multiple forms exist
  titleMaxLength?: number
  titleRequired?: boolean
}

export default function ArtworkDescriptionSection({
  title,
  description,
  artistId,
  artists,
  includeArtistDescription,
  includeArtistKeyDescription,
  includeArtistBiography,
  includeArtistNotableWorks,
  includeArtistMajorExhibitions,
  includeArtistAwardsHonors,
  includeArtistMarketValueRange,
  includeArtistSignatureStyle,
  conditionReport,
  onFieldChange,
  uniqueIdPrefix = '',
  titleMaxLength = 200,
  titleRequired = true
}: ArtworkDescriptionSectionProps) {

  return (
    <>
      {/* Title Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title {titleRequired && '*'} <span className="text-xs text-gray-500">(max {titleMaxLength} chars for LiveAuctioneers)</span>
        </label>
        <input
          type="text"
          maxLength={titleMaxLength}
          value={title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
          required={titleRequired}
        />
        <div className="text-xs text-gray-500 mt-1">
          {title.length}/{titleMaxLength} characters
        </div>
      </div>

      {/* Description Section with AI and Artist Info Options */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-purple-900 mb-4">Artwork Description & Export Options</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artwork Description {titleRequired && '*'}
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
            required={titleRequired}
            placeholder="Enter detailed description of the artwork..."
          />
        </div>

        {/* Artist Information Options for Export */}
        {artistId && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Include Artist Information in Export Description:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_description`}
                  checked={includeArtistDescription}
                  onChange={(e) => onFieldChange('include_artist_description', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_description`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Artist Description <span className="text-xs text-green-600">(default on)</span>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_key_description`}
                  checked={includeArtistKeyDescription}
                  onChange={(e) => onFieldChange('include_artist_key_description', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_key_description`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Artist Key Description <span className="text-xs text-green-600">(default on)</span>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_biography`}
                  checked={includeArtistBiography}
                  onChange={(e) => onFieldChange('include_artist_biography', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_biography`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Biography
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_notable_works`}
                  checked={includeArtistNotableWorks}
                  onChange={(e) => onFieldChange('include_artist_notable_works', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_notable_works`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Notable Works
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_major_exhibitions`}
                  checked={includeArtistMajorExhibitions}
                  onChange={(e) => onFieldChange('include_artist_major_exhibitions', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_major_exhibitions`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Major Exhibitions
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_awards_honors`}
                  checked={includeArtistAwardsHonors}
                  onChange={(e) => onFieldChange('include_artist_awards_honors', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_awards_honors`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Awards and Honors
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_market_value_range`}
                  checked={includeArtistMarketValueRange}
                  onChange={(e) => onFieldChange('include_artist_market_value_range', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_market_value_range`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Market Value Range
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`${uniqueIdPrefix}include_artist_signature_style`}
                  checked={includeArtistSignatureStyle}
                  onChange={(e) => onFieldChange('include_artist_signature_style', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded hover:border-purple-400 transition-colors duration-200 cursor-pointer"
                />
                <label htmlFor={`${uniqueIdPrefix}include_artist_signature_style`} className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors duration-200">
                  Include Signature Style
                </label>
              </div>
            </div>

            <div className="mt-3 text-xs text-purple-600">
              ℹ️ These options control what artist information appears in the exported description for auction platforms and CSV exports.
            </div>
          </div>
        )}
      </div>

      {/* Condition Report */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition Report
        </label>
        <textarea
          rows={3}
          value={conditionReport}
          onChange={(e) => onFieldChange('condition_report', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
          placeholder="Detailed condition report..."
        />
      </div>
    </>
  )
}
