// frontend/src/components/items/ItemsFilterNew.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { ArtworksAPI, ITEM_CATEGORIES, ITEM_PERIODS, ITEM_MATERIALS, ITEM_CONDITIONS } from '@/lib/items-api'
import { searchClients, formatClientDisplay, getClientDisplayName } from '@/lib/clients-api'
import { useBrand } from '@/lib/brand-context'

interface FilterState {
  status: string
  category: string
  search: string
  brand?: string
  item_id?: string
  low_est_min?: string
  low_est_max?: string
  high_est_min?: string
  high_est_max?: string
  start_price_min?: string
  start_price_max?: string
  condition?: string
  period_age?: string
  materials?: string
  artist_id?: string
  school_id?: string
  buyer_id?: string
  vendor_id?: string
}

interface ItemsFilterProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  statusCounts?: {
    draft: number
    active: number
    sold: number
    withdrawn: number
    passed: number
    returned: number
  }
  filteredStatusCounts?: {
    draft: number
    active: number
    sold: number
    withdrawn: number
    passed: number
    returned: number
  }
  totalItems?: number
}

// Convert arrays to SearchableOption format
const categoryOptions = ITEM_CATEGORIES.map(category => ({
  value: category,
  label: category
}))

const conditionOptions = ITEM_CONDITIONS.map(condition => ({
  value: condition,
  label: condition
}))

const periodOptions = ITEM_PERIODS.map(period => ({
  value: period,
  label: period
}))

const materialOptions = ITEM_MATERIALS.map(material => ({
  value: material,
  label: material
}))

const statuses = [
  { value: 'all', label: 'All Items', color: 'bg-gray-100 text-gray-800' },
  { value: 'draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-800' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-red-100 text-red-800' },
  { value: 'passed', label: 'Passed', color: 'bg-gray-100 text-gray-800' },
  { value: 'returned', label: 'Returned', color: 'bg-purple-100 text-purple-800' }
]

export default function ItemsFilter({ filters, onFilterChange, statusCounts, filteredStatusCounts, totalItems }: ItemsFilterProps) {
  const { brand } = useBrand()
  const [showFilters, setShowFilters] = useState(true)
  const [brands, setBrands] = useState<Array<{id: number, code: string, name: string}>>([])
  const [itemSuggestions, setItemSuggestions] = useState<Array<{value: string, label: string, description: string}>>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [buyerSuggestions, setBuyerSuggestions] = useState<Array<{value: string, label: string, description: string}>>([
    { value: '', label: 'All Buyers', description: 'Show items for all buyers' }
  ])
  const [vendorSuggestions, setVendorSuggestions] = useState<Array<{value: string, label: string, description: string}>>([
    { value: '', label: 'All Vendors', description: 'Show items for all vendors' }
  ])
  const [loadingBuyers, setLoadingBuyers] = useState(false)
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [selectedBuyerName, setSelectedBuyerName] = useState<string>('')
  const [selectedVendorName, setSelectedVendorName] = useState<string>('')

  // Dynamic search function for real-time search across ALL items
  const handleDynamicSearch = async (query: string): Promise<Array<{value: string, label: string, description?: string}>> => {
    if (!query.trim()) {
      return [{ value: '', label: 'All Items', description: 'Show all inventory items' }]
    }

    try {
      // Search across ALL items in database with no brand/amount restrictions
      const searchParams = {
        search: query,
        page: 1,
        limit: 50 // Limit results for performance but search across ALL items
      }

      const response = await ArtworksAPI.getArtworks(searchParams)

      const suggestions = [
        { value: '', label: 'All Items', description: 'Show all inventory items' }
      ]

      // Add search results with unique values
      const seenTitles = new Set<string>()
      response.data.forEach(item => {
        if (item.title && !seenTitles.has(item.title)) {
          seenTitles.add(item.title)
          suggestions.push({
            value: String(item.id), // Use unique item ID as value
            label: item.title,
            description: `ID: ${item.id} • ${item.category || 'Uncategorized'} • Artist ID: ${item.artist_id || 'Unknown'}`
          })
        }
      })

      // Add exact ID match if found (avoid duplicates)
      const exactIdMatch = response.data.find(item => String(item.id) === query.trim())
      if (exactIdMatch && exactIdMatch.title && !seenTitles.has(exactIdMatch.title)) {
        suggestions.splice(1, 0, {
          value: String(exactIdMatch.id),
          label: `ID: ${exactIdMatch.id}`,
          description: `${exactIdMatch.title} • ${exactIdMatch.category || 'Uncategorized'}`
        })
      }

      return suggestions
    } catch (error) {
      console.error('Dynamic search error:', error)
      return [{ value: '', label: 'All Items', description: 'Show all inventory items' }]
    }
  }

  // Dynamic search function for buyers
  const handleBuyerSearch = async (query: string): Promise<Array<{value: string, label: string, description?: string}>> => {
    if (!query.trim()) {
      return [{ value: '', label: 'All Buyers', description: 'Show items for all buyers' }]
    }

    try {
      setLoadingBuyers(true)
      // Search for clients that are buyers or buyer_vendors
      const [buyerResults, buyerVendorResults] = await Promise.all([
        searchClients(query, 10, 'buyer'),
        searchClients(query, 10, 'buyer_vendor')
      ])

      const suggestions = [
        { value: '', label: 'All Buyers', description: 'Show items for all buyers' }
      ]

      // Combine and deduplicate results
      const seenIds = new Set<number>()
      const allResults = [...buyerResults, ...buyerVendorResults]

      allResults.forEach(client => {
        if (!seenIds.has(client.id!)) {
          seenIds.add(client.id!)
          suggestions.push({
            value: String(client.id),
            label: getClientDisplayName(client),
            description: `${formatClientDisplay(client)} • ${client.client_type}`
          })
        }
      })

      return suggestions
    } catch (error) {
      console.error('Buyer search error:', error)
      return [{ value: '', label: 'All Buyers', description: 'Show items for all buyers' }]
    } finally {
      setLoadingBuyers(false)
    }
  }

  // Dynamic search function for vendors
  const handleVendorSearch = async (query: string): Promise<Array<{value: string, label: string, description?: string}>> => {
    if (!query.trim()) {
      return [{ value: '', label: 'All Vendors', description: 'Show items for all vendors' }]
    }

    try {
      setLoadingVendors(true)
      // Search for clients that are vendors or buyer_vendors
      const [vendorResults, buyerVendorResults] = await Promise.all([
        searchClients(query, 10, 'vendor'),
        searchClients(query, 10, 'buyer_vendor')
      ])

      const suggestions = [
        { value: '', label: 'All Vendors', description: 'Show items for all vendors' }
      ]

      // Combine and deduplicate results
      const seenIds = new Set<number>()
      const allResults = [...vendorResults, ...buyerVendorResults]

      allResults.forEach(client => {
        if (!seenIds.has(client.id!)) {
          seenIds.add(client.id!)
          suggestions.push({
            value: String(client.id),
            label: getClientDisplayName(client),
            description: `${formatClientDisplay(client)} • ${client.client_type}`
          })
        }
      })

      return suggestions
    } catch (error) {
      console.error('Vendor search error:', error)
      return [{ value: '', label: 'All Vendors', description: 'Show items for all vendors' }]
    } finally {
      setLoadingVendors(false)
    }
  }

  // Load basic suggestions for initial state
  useEffect(() => {
    const loadBasicSuggestions = async () => {
      try {
        setLoadingItems(true)
        // Load a few items for initial suggestions
        const getArtworksParams: any = {
          page: 1,
          limit: 20, // Just a few for initial state
        }

        const response = await ArtworksAPI.getArtworks(getArtworksParams)

        const suggestions = [
          { value: '', label: 'All Items', description: 'Show all inventory items' }
        ]

        // Add a few recent items as examples (ensure unique values)
        const seenTitles = new Set<string>()
        response.data.slice(0, 10).forEach(item => {
          if (item.title && !seenTitles.has(item.title)) {
            seenTitles.add(item.title)
            suggestions.push({
              value: String(item.id), // Use unique item ID as value
              label: item.title,
              description: `ID: ${item.id} • ${item.category || 'Uncategorized'}`
            })
          }
        })

        setItemSuggestions(suggestions)
      } catch (error) {
        console.error('Failed to load basic suggestions:', error)
        setItemSuggestions([
          { value: '', label: 'All Items', description: 'Show all inventory items' }
        ])
      } finally {
        setLoadingItems(false)
      }
    }

    const loadBrands = async () => {
      try {
        const token = localStorage.getItem('token')
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${backendUrl}/api/brands`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })
        if (response.ok) {
          const data = await response.json()
          setBrands(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load brands:', error)
      }
    }

    loadBrands()
    loadBasicSuggestions()
  }, [])

  const handleClearFilters = () => {
    setSelectedBuyerName('')
    setSelectedVendorName('')
    onFilterChange({
      status: 'all',
      category: '',
      search: '',
      brand: '',
      item_id: '',
      low_est_min: '',
      low_est_max: '',
      high_est_min: '',
      high_est_max: '',
      start_price_min: '',
      start_price_max: '',
      condition: '',
      period_age: '',
      materials: '',
      artist_id: '',
      school_id: '',
      buyer_id: '',
      vendor_id: ''
    })
  }

  const hasActiveFilters = filters.status !== 'all' ||
    filters.category !== '' ||
    filters.search !== '' ||
    filters.brand !== '' ||
    filters.item_id !== '' ||
    filters.low_est_min !== '' ||
    filters.low_est_max !== '' ||
    filters.high_est_min !== '' ||
    filters.high_est_max !== '' ||
    filters.start_price_min !== '' ||
    filters.start_price_max !== '' ||
    filters.condition !== '' ||
    filters.period_age !== '' ||
    filters.materials !== '' ||
    filters.artist_id !== '' ||
    filters.school_id !== '' ||
    filters.buyer_id !== '' ||
    filters.vendor_id !== ''

  // When filters are hidden, show only the toggle button
  if (!showFilters) {
    return (
      <div className="flex items-center justify-center py-4">
        <button
          onClick={() => setShowFilters(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          <Filter className="h-4 w-4 mr-2" />
          Show Filters
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {(() => {
                if (totalItems !== undefined) {
                  // If totalItems is provided, use it minus withdrawn count if available
                  const withdrawnCount = (filteredStatusCounts || statusCounts || {}).withdrawn || 0
                  return (totalItems - withdrawnCount).toLocaleString()
                }
                // Otherwise calculate from status counts excluding withdrawn
                const effectiveCounts = filteredStatusCounts || statusCounts || {}
                const totalExcludingWithdrawn = Object.entries(effectiveCounts).reduce((sum: number, [status, count]: [string, any]) => {
                  return status === 'withdrawn' ? sum : sum + (count as number)
                }, 0)
                return totalExcludingWithdrawn.toLocaleString()
              })()} items
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowFilters(false)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4 w-4 mr-1" />
              Hide
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-6 space-y-6">
        {/* Status Pills */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Status</h4>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => {
              const effectiveStatusCounts = filteredStatusCounts || statusCounts || {}
              const count = status.value === 'all'
                ? Object.entries(effectiveStatusCounts).reduce((sum: number, [statusKey, statusCount]: [string, any]) => {
                    // Exclude withdrawn items from "all" count
                    return statusKey === 'withdrawn' ? sum : sum + (statusCount as number)
                  }, 0)
                : (effectiveStatusCounts[status.value as keyof typeof effectiveStatusCounts] as number) || 0

              return (
                <button
                  key={status.value}
                  onClick={() => onFilterChange({ status: status.value })}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    filters.status === status.value
                      ? 'bg-teal-100 text-teal-800 border-2 border-teal-300 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    status.value === 'all' ? 'bg-gray-400' :
                    status.value === 'draft' ? 'bg-yellow-500' :
                    status.value === 'active' ? 'bg-green-500' :
                    status.value === 'sold' ? 'bg-blue-500' :
                    status.value === 'withdrawn' ? 'bg-red-500' :
                    status.value === 'returned' ? 'bg-purple-500' :
                    'bg-gray-400'
                  }`}></span>
                  {status.label}
                  <span className={`ml-2 text-xs font-semibold rounded-full px-2 py-0.5 ${
                    filters.status === status.value
                      ? 'bg-teal-200 text-teal-800'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}>
                    {count.toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Items</label>
            <SearchableSelect
              value={filters.search}
              options={itemSuggestions}
              placeholder={loadingItems ? "Loading items..." : "Search by title, description, artist, materials, category, ID, lot number..."}
              onChange={(value) => onFilterChange({ search: value?.toString() || '' })}
              inputPlaceholder="Search across title, description, artist, materials..."
              className="w-full"
              enableDynamicSearch={true}
              onSearch={handleDynamicSearch}
            />
          </div>

          {/* Item ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item ID</label>
            <input
              type="number"
              placeholder="Enter ID..."
              value={filters.item_id || ''}
              onChange={(e) => onFilterChange({ item_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <SearchableSelect
              value={filters.category}
              options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
              placeholder="Select category..."
              onChange={(value) => onFilterChange({ category: value?.toString() || '' })}
              className="w-full"
              inputPlaceholder="Type to search categories..."
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <select
              value={filters.brand || ''}
              onChange={(e) => onFilterChange({ brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.code}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <SearchableSelect
              value={filters.condition || ''}
              options={[{ value: '', label: 'All Conditions' }, ...conditionOptions]}
              placeholder="Select condition..."
              onChange={(value) => onFilterChange({ condition: value?.toString() || '' })}
              className="w-full"
              inputPlaceholder="Type to search conditions..."
            />
          </div>

          {/* Period/Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period/Age</label>
            <SearchableSelect
              value={filters.period_age || ''}
              options={[{ value: '', label: 'All Periods' }, ...periodOptions]}
              placeholder="Select period..."
              onChange={(value) => onFilterChange({ period_age: value?.toString() || '' })}
              className="w-full"
              inputPlaceholder="Type to search periods..."
            />
          </div>

          {/* Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Materials</label>
            <SearchableSelect
              value={filters.materials || ''}
              options={[{ value: '', label: 'All Materials' }, ...materialOptions]}
              placeholder="Select material..."
              onChange={(value) => onFilterChange({ materials: value?.toString() || '' })}
              className="w-full"
              inputPlaceholder="Type to search materials..."
            />
          </div>

          {/* Buyer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buyer</label>
            <SearchableSelect
              value={filters.buyer_id || ''}
              options={buyerSuggestions}
              placeholder={loadingBuyers ? "Loading buyers..." : "Search for buyer..."}
              onChange={(value) => {
                const buyerId = value?.toString() || ''
                const buyerName = buyerSuggestions.find(b => b.value === buyerId)?.label || ''
                setSelectedBuyerName(buyerName)
                onFilterChange({ buyer_id: buyerId })
              }}
              inputPlaceholder="Search buyers by name, email, or ID..."
              className="w-full"
              enableDynamicSearch={true}
              onSearch={handleBuyerSearch}
            />
          </div>

          {/* Vendor ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
            <SearchableSelect
              value={filters.vendor_id || ''}
              options={vendorSuggestions}
              placeholder={loadingVendors ? "Loading vendors..." : "Search for vendor..."}
              onChange={(value) => {
                const vendorId = value?.toString() || ''
                const vendorName = vendorSuggestions.find(v => v.value === vendorId)?.label || ''
                setSelectedVendorName(vendorName)
                onFilterChange({ vendor_id: vendorId })
              }}
              inputPlaceholder="Search vendors by name, email, or ID..."
              className="w-full"
              enableDynamicSearch={true}
              onSearch={handleVendorSearch}
            />
          </div>
        </div>

        {/* Price Range Filters */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Price Ranges</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Low Estimate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Low Estimate ($)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.low_est_min || ''}
                  onChange={(e) => onFilterChange({ low_est_min: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.low_est_max || ''}
                  onChange={(e) => onFilterChange({ low_est_max: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
              </div>
            </div>

            {/* High Estimate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">High Estimate ($)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.high_est_min || ''}
                  onChange={(e) => onFilterChange({ high_est_min: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.high_est_max || ''}
                  onChange={(e) => onFilterChange({ high_est_max: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
              </div>
            </div>

            {/* Start Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Price ($)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.start_price_min || ''}
                  onChange={(e) => onFilterChange({ start_price_min: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.start_price_max || ''}
                  onChange={(e) => onFilterChange({ start_price_max: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-600">Active filters:</span>

              {filters.status !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                  Status: {statuses.find(s => s.value === filters.status)?.label}
                  <button
                    onClick={() => onFilterChange({ status: 'all' })}
                    className="ml-2 text-teal-600 hover:text-teal-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Category: {filters.category}
                  <button
                    onClick={() => onFilterChange({ category: '' })}
                    className="ml-2 text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.search && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Search: "{filters.search}"
                  <button
                    onClick={() => onFilterChange({ search: '' })}
                    className="ml-2 text-purple-600 hover:text-purple-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.item_id && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Item ID: {filters.item_id}
                  <button
                    onClick={() => onFilterChange({ item_id: '' })}
                    className="ml-2 text-green-600 hover:text-green-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.brand && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Brand: {brands.find(b => b.code === filters.brand)?.name || filters.brand}
                  <button
                    onClick={() => onFilterChange({ brand: '' })}
                    className="ml-2 text-orange-600 hover:text-orange-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {(filters.low_est_min || filters.low_est_max) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Low Est: {filters.low_est_min || '0'} - {filters.low_est_max || '∞'}
                  <button
                    onClick={() => onFilterChange({ low_est_min: '', low_est_max: '' })}
                    className="ml-2 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {(filters.high_est_min || filters.high_est_max) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                  High Est: {filters.high_est_min || '0'} - {filters.high_est_max || '∞'}
                  <button
                    onClick={() => onFilterChange({ high_est_min: '', high_est_max: '' })}
                    className="ml-2 text-pink-600 hover:text-pink-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {(filters.start_price_min || filters.start_price_max) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                  Start Price: {filters.start_price_min || '0'} - {filters.start_price_max || '∞'}
                  <button
                    onClick={() => onFilterChange({ start_price_min: '', start_price_max: '' })}
                    className="ml-2 text-cyan-600 hover:text-cyan-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.condition && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Condition: {filters.condition}
                  <button
                    onClick={() => onFilterChange({ condition: '' })}
                    className="ml-2 text-yellow-600 hover:text-yellow-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.period_age && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Period: {filters.period_age}
                  <button
                    onClick={() => onFilterChange({ period_age: '' })}
                    className="ml-2 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.materials && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                  Materials: {filters.materials}
                  <button
                    onClick={() => onFilterChange({ materials: '' })}
                    className="ml-2 text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.buyer_id && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                  Buyer: {selectedBuyerName || `ID: ${filters.buyer_id}`}
                  <button
                    onClick={() => {
                      setSelectedBuyerName('')
                      onFilterChange({ buyer_id: '' })
                    }}
                    className="ml-2 text-violet-600 hover:text-violet-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.vendor_id && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800">
                  Vendor: {selectedVendorName || `ID: ${filters.vendor_id}`}
                  <button
                    onClick={() => {
                      setSelectedVendorName('')
                      onFilterChange({ vendor_id: '' })
                    }}
                    className="ml-2 text-lime-600 hover:text-lime-800 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 