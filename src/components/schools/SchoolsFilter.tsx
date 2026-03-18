// frontend/src/components/schools/SchoolsFilter.tsx
import React, { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

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

function CustomDropdown({ label, value, options, onChange, defaultValue }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  defaultValue: string;
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.value === value)?.label || options[0]?.label
  const isFiltered = value !== defaultValue

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('mousedown', handleClickOutside) }
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md cursor-pointer bg-white ${isFiltered ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm truncate ${isFiltered ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>{selectedLabel}</span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {isFiltered && (
            <button onClick={(e) => { e.stopPropagation(); onChange(defaultValue); setIsOpen(false) }}
              className="p-0.5 rounded-full hover:bg-teal-200 text-teal-600" title="Clear">
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
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="py-1 max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button key={option.value} onClick={() => { onChange(option.value); setIsOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700 ${value === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SchoolsFilter({ filters, onFilterChange }: SchoolsFilterProps) {
  const schoolTypes = [
    'Art School', 'Academy', 'University', 'Institute',
    'College', 'Conservatory', 'Workshop', 'Atelier', 'Studio School'
  ]

  const commonCountries = [
    'United States', 'United Kingdom', 'France', 'Germany', 'Italy',
    'Spain', 'Netherlands', 'Austria', 'Russia', 'Japan', 'China',
    'Canada', 'Australia'
  ]

  const countryOptions = [
    { value: '', label: 'All Countries' },
    ...commonCountries.map(c => ({ value: c, label: c }))
  ]

  const schoolTypeOptions = [
    { value: '', label: 'All Types' },
    ...schoolTypes.map(t => ({ value: t, label: t }))
  ]

  const clearFilters = () => {
    onFilterChange({ status: 'active', country: '', school_type: '', search: '' })
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
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
        <CustomDropdown
          label="Country"
          value={filters.country}
          options={countryOptions}
          onChange={(val) => onFilterChange({ country: val })}
          defaultValue=""
        />

        {/* School Type Filter */}
        <CustomDropdown
          label="School Type"
          value={filters.school_type}
          options={schoolTypeOptions}
          onChange={(val) => onFilterChange({ school_type: val })}
          defaultValue=""
        />
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