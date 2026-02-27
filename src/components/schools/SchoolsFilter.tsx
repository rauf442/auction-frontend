// frontend/src/components/schools/SchoolsFilter.tsx
import React from 'react'
import { Search, X } from 'lucide-react'

interface FilterState {
  status: string;
  country: string;
  school_type: string;
  search: string;
}

interface SchoolsFilterProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
}

export default function SchoolsFilter({ filters, onFilterChange }: SchoolsFilterProps) {
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

  const commonCountries = [
    'United States',
    'United Kingdom',
    'France',
    'Germany',
    'Italy',
    'Spain',
    'Netherlands',
    'Austria',
    'Russia',
    'Japan',
    'China',
    'Canada',
    'Australia'
  ]

  const clearFilters = () => {
    onFilterChange({
      status: 'active',
      country: '',
      school_type: '',
      search: ''
    })
  }

  const hasActiveFilters = filters.search || filters.country || filters.school_type || filters.status !== 'active'

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
        {['all', 'active', 'inactive', 'archived'].map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange({ status })}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filters.status === status
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Search, Country, and Type Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="Search schools..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Country Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <select
            value={filters.country}
            onChange={(e) => onFilterChange({ country: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Countries</option>
            {commonCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* School Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School Type
          </label>
          <select
            value={filters.school_type}
            onChange={(e) => onFilterChange({ school_type: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {schoolTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
} 