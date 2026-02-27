"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { fetchClients, type Client } from '@/lib/clients-api'

interface FiltersType {
  status: string;
  search: string;
  sort_field: string;
  sort_direction: 'asc' | 'desc';
  client_type?: string;
  platform?: string;
  registration_date?: 'all' | '30days' | '3months' | '6months' | '1year';
}

interface ClientsFilterProps {
  filters: FiltersType;
  onFilterChange: (newFilters: Partial<FiltersType>) => void;
}

export default function ClientsFilter({ filters, onFilterChange }: ClientsFilterProps) {
  const [searchSuggestions, setSearchSuggestions] = useState<Client[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
    // Debounced suggestions
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    const value = e.target.value
    if (!value || value.trim() === '') {
      setSearchSuggestions([])
      setShowSearchSuggestions(false)
      return
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetchClients({ search: value, limit: 8, status: 'active' })
        setSearchSuggestions(res.data || [])
        setShowSearchSuggestions(true)
      } catch {
        setSearchSuggestions([])
        setShowSearchSuggestions(false)
      }
    }, 200)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ status: e.target.value });
  }

  const handleClientTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ client_type: e.target.value });
  }

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('platform', e.target.value);
    onFilterChange({ platform: e.target.value });
  }

  const clearSearch = () => {
    onFilterChange({ search: '' });
    setSearchSuggestions([])
    setShowSearchSuggestions(false)
  }

  const selectSearchSuggestion = (client: Client) => {
    // Prefer email/phone/name for quick search
    const text = client.id ? String(client.id) : client.email || client.phone_number || `${client.first_name} ${client.last_name}`
    onFilterChange({ search: text || '' })
    setShowSearchSuggestions(false)
  }

  // Close suggestion popovers on outside click
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(ev.target as Node)) {
        setShowSearchSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="p-6 bg-white" ref={containerRef}>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients by id, name, email, or company..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto">
              {searchSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectSearchSuggestion(c)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  <div className="font-medium text-gray-900">{`${c.first_name || ''} ${c.last_name || ''}`.trim() || String(c.id)}</div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    {c.id && <span>{String(c.id)}</span>}
                    {c.email && <span>• {c.email}</span>}
                    {c.phone_number && <span>• {c.phone_number}</span>}
                    {c.company_name && <span>• {c.company_name}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
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
            onChange={handleStatusChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {/* Client Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Type
          </label>
          <select
            value={filters.client_type || 'all'}
            onChange={handleClientTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="buyer">Buyer</option>
            <option value="vendor">Vendor</option>
            <option value="supplier">Supplier</option>
            <option value="buyer_vendor">Buyer & Vendor</option>
          </select>
        </div>

        {/* Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform
          </label>
          <select
            value={filters.platform || 'all'}
            onChange={handlePlatformChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="Liveauctioneer">Liveauctioneer</option>
            <option value="The saleroom">The saleroom</option>
            <option value="Invaluable">Invaluable</option>
            <option value="Easylive auctions">Easylive auctions</option>
            <option value="Private">Private</option>
            <option value="Others">Others</option>
          </select>
        </div>

        {/* Registration Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Date
          </label>
          <select
            value={filters.registration_date || 'all'}
            onChange={(e) => onFilterChange({ registration_date: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            <option value="all">All Dates</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="1year">Last year</option>
          </select>
        </div>


      </div>
    </div>
  )
} 