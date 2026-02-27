// frontend/src/components/auctions/AuctionsFilter.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, X, Calendar } from 'lucide-react'
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

// Interface for auction suggestion
interface AuctionSuggestion {
  value: string
  label: string
  description: string
}

export default function AuctionsFilter({ filters, onFilterChange, statusCounts }: AuctionsFilterProps) {
  const { brand } = useBrand()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [specialists, setSpecialists] = useState<Array<{ id: string, name: string }>>([])
  const [auctionSuggestions, setAuctionSuggestions] = useState<AuctionSuggestion[]>([])
  const [loadingAuctions, setLoadingAuctions] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])

  // Get brand ID from brand code - memoized to prevent infinite useEffect loops
  // Handle "ALL" as no brand filter
  const getBrandId = useCallback((brandCode: string): number | null | undefined => {
    if (brandCode === 'ALL') {
      return null; // No brand filter - all brands eligible
    }
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }, [brands])

  useEffect(() => {
    // Load specialists/users and auction suggestions
    loadSpecialists()
    loadBrands()
  }, [])

  useEffect(() => {
    if (brands.length > 0) {
      loadAuctionSuggestions()
    }
  }, [brand, brands, getBrandId])

  const loadBrands = async () => {
    try {
      const response = await getBrands()
      if (response.success) {
        setBrands(response.data)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const loadSpecialists = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const formattedSpecialists = data.data.map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim() || user.email
          }))
          setSpecialists(formattedSpecialists)
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
        ...(brandId !== null && { brand_id: brandId }) // Only include brand_id if not null (ALL brands)
      })

      // Create suggestions from real auctions
      const suggestions: AuctionSuggestion[] = [
        { value: '', label: 'All Auctions', description: 'Show all auctions' }
      ]

      response.auctions.map(auction => suggestions.push({
        value: auction.id.toString(),
        label: `${auction.short_name} - ${auction.long_name}`,
        description: `${auction.short_name} ${auction.long_name} ${auction.description || ''}`.toLowerCase()
      }))

      // Remove duplicates based on value
      const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
        index === self.findIndex(s => s.value === suggestion.value)
      )

      setAuctionSuggestions(uniqueSuggestions)
    } catch (error) {
      console.error('Error loading auction suggestions:', error)
      // Fallback to empty suggestions
      setAuctionSuggestions([
        { value: '', label: 'All Auctions', description: 'Show all auctions' }
      ])
    } finally {
      setLoadingAuctions(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Debounce the search
    const timeoutId = setTimeout(() => {
      onFilterChange({ search: value })
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ [key]: value })
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    onFilterChange({
      status: 'all',
      type: 'all',
      search: '',
      specialist: 'all',
      dateRange: 'all'
    })
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

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header Row with Search and Toggle */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Search Bar */}
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
          {/* Active Filters Count */}
          {getActiveFiltersCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''}
            </span>
          )}

          {/* Clear Filters Button */}
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer"
            >
              Clear all
            </button>
          )}

          {/* Toggle Filters Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">
              {isExpanded ? 'Hide Filters' : 'More Filters'}
            </span>
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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${filters.status === status.value
                  ? status.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {status.label}
              {statusCounts && status.value !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({statusCounts[status.value as keyof typeof statusCounts] || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-gray-100">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Auction Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auction Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {auctionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialist Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialist
              </label>
              <select
                value={filters.specialist}
                onChange={(e) => handleFilterChange('specialist', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Specialists</option>
                {specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {dateRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-end">
              <div className="w-full space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quick Actions
                </label>
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
