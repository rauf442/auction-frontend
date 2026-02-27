// frontend/src/components/artists/ArtistsFilter.tsx
import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
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

export default function ArtistsFilter({ filters, onFilterChange }: ArtistsFilterProps) {
  const [artistSuggestions, setArtistSuggestions] = useState<Array<{value: string, label: string, description: string}>>([])
  const [loadingArtists, setLoadingArtists] = useState(false)

  // Load artist suggestions
  useEffect(() => {
    const loadArtistSuggestions = async () => {
      try {
        setLoadingArtists(true)
        const response = await ArtistsAPI.getArtists({ limit: 200 }) // Get enough for good suggestions
        
        if (response.success) {
          const suggestions = [
            { value: '', label: 'All Artists', description: 'Show all artists' }
          ]
          
          // Add unique artist names and nationalities
          const artistNames = new Set<string>()
          const nationalities = new Set<string>()
          
          response.data.forEach((artist: any) => {
            // Add artist names
            if (artist.name && !artistNames.has(artist.name.toLowerCase())) {
              artistNames.add(artist.name.toLowerCase())
              if (artistNames.size <= 15) { // Limit suggestions
                suggestions.push({
                  value: artist.name,
                  label: artist.name,
                  description: `Search for ${artist.name}${artist.nationality ? ` (${artist.nationality})` : ''}`
                })
              }
            }
            
            // Add unique nationalities
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
        setArtistSuggestions([
          { value: '', label: 'All Artists', description: 'Show all artists' }
        ])
      } finally {
        setLoadingArtists(false)
      }
    }

    loadArtistSuggestions()
  }, [])

  const handleClearFilters = () => {
    onFilterChange({
      status: 'active',
      nationality: '',
      art_movement: '',
      search: ''
    })
  }

  const hasActiveFilters = filters.search || filters.nationality || filters.art_movement || filters.status !== 'active'

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="all">All Status</option>
          </select>
        </div>

        {/* Nationality Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nationality
          </label>
          <select
            value={filters.nationality}
            onChange={(e) => onFilterChange({ nationality: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Nationalities</option>
            <option value="American">American</option>
            <option value="British">British</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Italian">Italian</option>
            <option value="Spanish">Spanish</option>
            <option value="Dutch">Dutch</option>
            <option value="Russian">Russian</option>
            <option value="Japanese">Japanese</option>
            <option value="Chinese">Chinese</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Art Movement Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Art Movement
          </label>
          <select
            value={filters.art_movement}
            onChange={(e) => onFilterChange({ art_movement: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Movements</option>
            <option value="Renaissance">Renaissance</option>
            <option value="Baroque">Baroque</option>
            <option value="Neoclassicism">Neoclassicism</option>
            <option value="Romanticism">Romanticism</option>
            <option value="Realism">Realism</option>
            <option value="Impressionism">Impressionism</option>
            <option value="Post-Impressionism">Post-Impressionism</option>
            <option value="Expressionism">Expressionism</option>
            <option value="Cubism">Cubism</option>
            <option value="Surrealism">Surrealism</option>
            <option value="Abstract Expressionism">Abstract Expressionism</option>
            <option value="Pop Art">Pop Art</option>
            <option value="Minimalism">Minimalism</option>
            <option value="Contemporary">Contemporary</option>
            <option value="Modern">Modern</option>
            <option value="Other">Other</option>
          </select>
        </div>

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
              <button
                onClick={() => onFilterChange({ search: '' })}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.nationality && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Nationality: {filters.nationality}
              <button
                onClick={() => onFilterChange({ nationality: '' })}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.art_movement && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Movement: {filters.art_movement}
              <button
                onClick={() => onFilterChange({ art_movement: '' })}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.status !== 'active' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Status: {filters.status}
              <button
                onClick={() => onFilterChange({ status: 'active' })}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
} 