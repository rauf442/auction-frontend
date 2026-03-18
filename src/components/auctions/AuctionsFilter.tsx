// frontend/src/components/auctions/AuctionsFilter.tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Filter, X, Calendar, ChevronDown } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { getAuctions } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import { useBrand } from '@/lib/brand-context'

interface FilterState {
  status: string
  type: string
  search: string
  specialist: string
  dateRange: string
}

interface AuctionsFilterProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  statusCounts?: {
    future: number
    present: number
    past: number
  }
}

const statuses = [
  { value: 'all', label: 'All Auctions', color: 'bg-gray-100 text-gray-800' },
  { value: 'future', label: 'Future', color: 'bg-blue-100 text-blue-800' },
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'past', label: 'Past', color: 'bg-red-100 text-red-800' }
]

const auctionTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'timed', label: 'Timed Auction' },
  { value: 'live', label: 'Live Auction' },
  { value: 'sealed_bid', label: 'Private Sale' }
]

const dateRanges = [
  { value: 'all', label: 'All Dates' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'next_month', label: 'Next Month' },
  { value: 'past_month', label: 'Past Month' },
  { value: 'custom', label: 'Custom Range' }
]

interface AuctionSuggestion {
  value: string
  label: string
  description: string
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
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <div
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg cursor-pointer bg-white ${isFiltered ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}`}
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

export default function AuctionsFilter({ filters, onFilterChange, statusCounts }: AuctionsFilterProps) {
  const { brand } = useBrand()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [specialists, setSpecialists] = useState<Array<{ id: string, name: string }>>([])
  const [auctionSuggestions, setAuctionSuggestions] = useState<AuctionSuggestion[]>([])
  const [loadingAuctions, setLoadingAuctions] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])

  const getBrandId = useCallback((brandCode: string): number | null | undefined => {
    if (brandCode === 'ALL') return null
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }, [brands])

  useEffect(() => {
    loadSpecialists()
    loadBrands()
  }, [])

  useEffect(() => {
    if (brands.length > 0) loadAuctionSuggestions()
  }, [brand, brands, getBrandId])

  const loadBrands = async () => {
    try {
      const response = await getBrands()
      if (response.success) setBrands(response.data)
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const loadSpecialists = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSpecialists(data.data.map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim() || user.email
          })))
        }
      }
    } catch (error) {
      console.error('Error loading specialists:', error)
    }
  }

  const loadAuctionSuggestions = async () => {
    try {
      setLoadingAuctions(true)
      const brandId = getBrandId(brand)
      const response = await getAuctions({
        limit: 100,
        sort_field: 'created_at',
        sort_direction: 'desc',
        ...(brandId !== null && { brand_id: brandId })
      })
      const suggestions: AuctionSuggestion[] = [{ value: '', label: 'All Auctions', description: 'Show all auctions' }]
      response.auctions.map(auction => suggestions.push({
        value: auction.id.toString(),
        label: `${auction.short_name} - ${auction.long_name}`,
        description: `${auction.short_name} ${auction.long_name} ${auction.description || ''}`.toLowerCase()
      }))
      const uniqueSuggestions = suggestions.filter((s, i, self) => i === self.findIndex(x => x.value === s.value))
      setAuctionSuggestions(uniqueSuggestions)
    } catch (error) {
      console.error('Error loading auction suggestions:', error)
      setAuctionSuggestions([{ value: '', label: 'All Auctions', description: 'Show all auctions' }])
    } finally {
      setLoadingAuctions(false)
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ [key]: value })
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    onFilterChange({ status: 'all', type: 'all', search: '', specialist: 'all', dateRange: 'all' })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.status !== 'all') count++
    if (filters.type !== 'all') count++
    if (filters.search) count++
    if (filters.specialist !== 'all') count++
    if (filters.dateRange !== 'all') count++
    return count
  }

  const specialistOptions = [
    { value: 'all', label: 'All Specialists' },
    ...specialists.map(s => ({ value: s.id, label: s.name }))
  ]

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header Row with Search and Toggle */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-1 max-w-md">
            <SearchableSelect
              value={filters.search}
              options={auctionSuggestions}
              placeholder={loadingAuctions ? "Loading auctions..." : "Search auctions..."}
              onChange={(value) => {
                const searchValue = value?.toString() || ''
                setSearchTerm(searchValue)
                onFilterChange({ search: searchValue })
              }}
              inputPlaceholder="Search by auction name or description..."
              className="w-full"
              disabled={loadingAuctions}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getActiveFiltersCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''}
            </span>
          )}
          {getActiveFiltersCount() > 0 && (
            <button onClick={clearAllFilters} className="text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer">
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">{isExpanded ? 'Hide Filters' : 'More Filters'}</span>
          </button>
        </div>
      </div>

      {/* Status Pills Row */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => handleFilterChange('status', status.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${filters.status === status.value ? status.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {status.label}
              {statusCounts && status.value !== 'all' && (
                <span className="ml-1 text-xs opacity-75">({statusCounts[status.value as keyof typeof statusCounts] || 0})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-gray-100">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <CustomDropdown
              label="Auction Type"
              value={filters.type}
              options={auctionTypes}
              onChange={(val) => handleFilterChange('type', val)}
              defaultValue="all"
            />

            <CustomDropdown
              label="Specialist"
              value={filters.specialist}
              options={specialistOptions}
              onChange={(val) => handleFilterChange('specialist', val)}
              defaultValue="all"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Range
              </label>
              <CustomDropdown
                label=""
                value={filters.dateRange}
                options={dateRanges}
                onChange={(val) => handleFilterChange('dateRange', val)}
                defaultValue="all"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-end">
              <div className="w-full space-y-2">
                <label className="block text-sm font-medium text-gray-700">Quick Actions</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterChange('status', 'in_progress')}
                    className="px-3 py-2 bg-orange-100 text-orange-800 rounded-lg text-xs hover:bg-orange-200 transition-colors cursor-pointer"
                  >
                    Active Now
                  </button>
                  <button
                    onClick={() => handleFilterChange('dateRange', 'this_week')}
                    className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-xs hover:bg-blue-200 transition-colors cursor-pointer"
                  >
                    This Week
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}