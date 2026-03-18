// frontend/src/components/artists/ArtistsFilter.tsx
import React, { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { ArtistsAPI } from '@/lib/artists-api'

interface FilterState {
  status: string;
  nationality: string;
  art_movement: string;
  search: string;
}

interface ArtistsFilterProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

// Reusable custom dropdown with X button and Escape key support
interface CustomDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  defaultValue: string;
}

function CustomDropdown({ label, value, options, onChange, defaultValue }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label || options[0]?.label
  const isFiltered = value !== defaultValue

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md cursor-pointer bg-white ${isFiltered ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm truncate ${isFiltered ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>
          {selectedLabel}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {isFiltered && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(defaultValue); setIsOpen(false) }}
              className="p-0.5 rounded-full hover:bg-teal-200 text-teal-600"
              title="Clear filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="py-1 max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700 transition-colors ${value === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ArtistsFilter({ filters, onFilterChange }: ArtistsFilterProps) {
  const [artistSuggestions, setArtistSuggestions] = useState<Array<{value: string, label: string, description: string}>>([])
  const [loadingArtists, setLoadingArtists] = useState(false)

  useEffect(() => {
    const loadArtistSuggestions = async () => {
      try {
        setLoadingArtists(true)
        const response = await ArtistsAPI.getArtists({ limit: 200 })
        if (response.success) {
          const suggestions = [{ value: '', label: 'All Artists', description: 'Show all artists' }]
          const artistNames = new Set<string>()
          const nationalities = new Set<string>()
          response.data.forEach((artist: any) => {
            if (artist.name && !artistNames.has(artist.name.toLowerCase())) {
              artistNames.add(artist.name.toLowerCase())
              if (artistNames.size <= 15) {
                suggestions.push({
                  value: artist.name,
                  label: artist.name,
                  description: `Search for ${artist.name}${artist.nationality ? ` (${artist.nationality})` : ''}`
                })
              }
            }
            if (artist.nationality && !nationalities.has(artist.nationality.toLowerCase())) {
              nationalities.add(artist.nationality.toLowerCase())
              if (nationalities.size <= 10) {
                suggestions.push({
                  value: artist.nationality,
                  label: `${artist.nationality} Artists`,
                  description: `Search for ${artist.nationality} artists`
                })
              }
            }
          })
          setArtistSuggestions(suggestions)
        }
      } catch (error) {
        console.error('Error loading artist suggestions:', error)
        setArtistSuggestions([{ value: '', label: 'All Artists', description: 'Show all artists' }])
      } finally {
        setLoadingArtists(false)
      }
    }
    loadArtistSuggestions()
  }, [])

  const handleClearFilters = () => {
    onFilterChange({ status: 'active', nationality: '', art_movement: '', search: '' })
  }

  const hasActiveFilters = filters.search || filters.nationality || filters.art_movement || filters.status !== 'active'

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All Status' },
  ]

  const nationalityOptions = [
    { value: '', label: 'All Nationalities' },
    { value: 'American', label: 'American' },
    { value: 'British', label: 'British' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Italian', label: 'Italian' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'Dutch', label: 'Dutch' },
    { value: 'Russian', label: 'Russian' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Chinese', label: 'Chinese' },
    { value: 'Other', label: 'Other' },
  ]

  const artMovementOptions = [
    { value: '', label: 'All Movements' },
    { value: 'Renaissance', label: 'Renaissance' },
    { value: 'Baroque', label: 'Baroque' },
    { value: 'Neoclassicism', label: 'Neoclassicism' },
    { value: 'Romanticism', label: 'Romanticism' },
    { value: 'Realism', label: 'Realism' },
    { value: 'Impressionism', label: 'Impressionism' },
    { value: 'Post-Impressionism', label: 'Post-Impressionism' },
    { value: 'Expressionism', label: 'Expressionism' },
    { value: 'Cubism', label: 'Cubism' },
    { value: 'Surrealism', label: 'Surrealism' },
    { value: 'Abstract Expressionism', label: 'Abstract Expressionism' },
    { value: 'Pop Art', label: 'Pop Art' },
    { value: 'Minimalism', label: 'Minimalism' },
    { value: 'Contemporary', label: 'Contemporary' },
    { value: 'Modern', label: 'Modern' },
    { value: 'Other', label: 'Other' },
  ]

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Artists</label>
        <SearchableSelect
          value={filters.search}
          options={artistSuggestions}
          placeholder={loadingArtists ? "Loading artists..." : "Search artists..."}
          onChange={(value) => onFilterChange({ search: value?.toString() || '' })}
          inputPlaceholder="Search by name, nationality, movement, or description..."
          className="w-full"
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomDropdown
          label="Status"
          value={filters.status}
          options={statusOptions}
          onChange={(val) => onFilterChange({ status: val })}
          defaultValue="active"
        />
        <CustomDropdown
          label="Nationality"
          value={filters.nationality}
          options={nationalityOptions}
          onChange={(val) => onFilterChange({ nationality: val })}
          defaultValue=""
        />
        <CustomDropdown
          label="Art Movement"
          value={filters.art_movement}
          options={artMovementOptions}
          onChange={(val) => onFilterChange({ art_movement: val })}
          defaultValue=""
        />
        {/* Clear Filters */}
        <div className="flex items-end">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md border"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{filters.search}"
              <button onClick={() => onFilterChange({ search: '' })} className="ml-1 text-blue-600 hover:text-blue-800">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.nationality && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Nationality: {filters.nationality}
              <button onClick={() => onFilterChange({ nationality: '' })} className="ml-1 text-green-600 hover:text-green-800">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.art_movement && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Movement: {filters.art_movement}
              <button onClick={() => onFilterChange({ art_movement: '' })} className="ml-1 text-purple-600 hover:text-purple-800">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.status !== 'active' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Status: {filters.status}
              <button onClick={() => onFilterChange({ status: 'active' })} className="ml-1 text-yellow-600 hover:text-yellow-800">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}