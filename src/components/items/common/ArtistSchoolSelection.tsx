// frontend/src/components/items/common/ArtistSchoolSelection.tsx
"use client"

import React from 'react'
import SearchableSelect, { SearchableOption } from '@/components/ui/SearchableSelect'
import { Artist } from '@/lib/artists-api'
import { School } from '@/lib/schools-api'

interface ArtistSchoolSelectionProps {
  artistId: string
  schoolId: string
  artworkSubject: string
  signaturePlacement: string
  medium: string
  periodAge: string
  artists: Artist[]
  schools: School[]
  loadingArtistsSchools: boolean
  materialOptions: SearchableOption[]
  periodOptions: SearchableOption[]
  onFieldChange: (field: string, value: string | boolean) => void
  uniqueIdPrefix?: string // For unique IDs when multiple forms exist
}

export default function ArtistSchoolSelection({
  artistId,
  schoolId,
  artworkSubject,
  signaturePlacement,
  medium,
  periodAge,
  artists,
  schools,
  loadingArtistsSchools,
  materialOptions,
  periodOptions,
  onFieldChange,
  uniqueIdPrefix = ''
}: ArtistSchoolSelectionProps) {
  
  // Helper function to create artist options for SearchableSelect
  const createArtistOptions = (): SearchableOption[] => {
    return artists
      .filter(artist => artist.id) // Ensure id exists
      .map(artist => ({
        value: artist.id!.toString(), // Ensure consistent string type
        label: artist.name,
        description: artist.birth_year && artist.death_year
          ? `${artist.birth_year} - ${artist.death_year}`
          : artist.birth_year
            ? `Born ${artist.birth_year}`
            : artist.nationality || ''
      }))
  }

  // Helper function to create school options for SearchableSelect
  const createSchoolOptions = (): SearchableOption[] => {
    return schools
      .filter(school => school.id) // Ensure id exists
      .map(school => ({
        value: school.id!.toString(), // Ensure consistent string type
        label: school.name,
        description: school.location || ''
      }))
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-green-900 mb-4">Artist/School & Medium Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artist
          </label>
          <SearchableSelect
            value={artistId}
            options={artists.length > 0 ? createArtistOptions() : []}
            placeholder={loadingArtistsSchools ? "Loading artists..." : "Select artist..."}
            onChange={(value) => {
              const selectedArtistId = value?.toString() || ''
              onFieldChange('artist_id', selectedArtistId)
              // Clear school selection when artist is selected
              if (selectedArtistId) {
                onFieldChange('school_id', '')
              }
            }}
            disabled={loadingArtistsSchools || artists.length === 0}
            inputPlaceholder="Search artists..."
          />
          {loadingArtistsSchools && (
            <p className="text-xs text-gray-500 mt-1">Loading artists...</p>
          )}
          {artistId && (
            <p className="text-xs text-green-600 mt-1">
              Selected: {(() => {
                const artist = artists.find(a => a.id?.toString() === artistId)
                return artist ? artist.name : `ID: ${artistId} (not found)`
              })()}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School (if no specific artist)
          </label>
          <SearchableSelect
            value={schoolId}
            options={schools.length > 0 ? createSchoolOptions() : []}
            placeholder={loadingArtistsSchools ? "Loading schools..." : "Select school..."}
            onChange={(value) => {
              const selectedSchoolId = value?.toString() || ''
              onFieldChange('school_id', selectedSchoolId)
              // Clear artist selection when school is selected
              if (selectedSchoolId) {
                onFieldChange('artist_id', '')
              }
            }}
            disabled={loadingArtistsSchools || schools.length === 0}
            inputPlaceholder="Search schools..."
          />
          {loadingArtistsSchools && (
            <p className="text-xs text-gray-500 mt-1">Loading schools...</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medium/Materials
          </label>
          <SearchableSelect
            value={medium}
            options={[{ value: '', label: 'Select material...' }, ...materialOptions]}
            placeholder="Select material..."
            onChange={(value) => onFieldChange('medium', value?.toString() || '')}
            className="w-full"
            inputPlaceholder="Type to search materials..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artwork Subject
          </label>
          <input
            type="text"
            value={artworkSubject}
            onChange={(e) => onFieldChange('artwork_subject', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="e.g., Portrait, Landscape, Abstract composition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signature Placement
          </label>
          <input
            type="text"
            value={signaturePlacement}
            onChange={(e) => onFieldChange('signature_placement', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="e.g., Lower right, Verso, Not visible"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Period/Age
          </label>
          <SearchableSelect
            value={periodAge}
            options={[{ value: '', label: 'Select period...' }, ...periodOptions]}
            placeholder="Select period..."
            onChange={(value) => onFieldChange('period_age', value?.toString() || '')}
            className="w-full"
            inputPlaceholder="Type to search periods..."
          />
        </div>
      </div>

      {artistId && schoolId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Both artist and school are selected. Only one will be saved.
          </p>
        </div>
      )}
    </div>
  )
}


