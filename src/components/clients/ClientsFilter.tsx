"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
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

// Custom dropdown component with X button and Escape key support
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isFiltered = value !== defaultValue

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md cursor-pointer bg-white focus-within:ring-2 focus-within:ring-teal-500 ${isFiltered ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm truncate ${isFiltered ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>
          {selectedLabel}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {isFiltered && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChange(defaultValue)
                setIsOpen(false)
              }}
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
          {/* Header with X close button */}
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
          {/* Options */}
          <div className="py-1 max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
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

export default function ClientsFilter({ filters, onFilterChange }: ClientsFilterProps) {
  const [searchSuggestions, setSearchSuggestions] = useState<Client[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
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

  const clearSearch = () => {
    onFilterChange({ search: '' });
    setSearchSuggestions([])
    setShowSearchSuggestions(false)
  }

  const selectSearchSuggestion = (client: Client) => {
    const text = client.id ? String(client.id) : client.email || client.phone_number || `${client.first_name} ${client.last_name}`
    onFilterChange({ search: text || '' })
    setShowSearchSuggestions(false)
  }

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

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending', label: 'Pending' },
    { value: 'archived', label: 'Archived' },
    { value: 'deleted', label: 'Deleted' },
  ]

  const clientTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'buyer', label: 'Buyer' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'buyer_vendor', label: 'Buyer & Vendor' },
  ]

  const platformOptions = [
    { value: 'all', label: 'All' },
    { value: 'Liveauctioneer', label: 'Liveauctioneer' },
    { value: 'The saleroom', label: 'The saleroom' },
    { value: 'Invaluable', label: 'Invaluable' },
    { value: 'Easylive auctions', label: 'Easylive auctions' },
    { value: 'Private', label: 'Private' },
    { value: 'Others', label: 'Others' },
  ]

  const registrationDateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: '30days', label: 'Last 30 days' },
    { value: '3months', label: 'Last 3 months' },
    { value: '6months', label: 'Last 6 months' },
    { value: '1year', label: 'Last year' },
  ]

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomDropdown
          label="Status"
          value={filters.status}
          options={statusOptions}
          onChange={(val) => onFilterChange({ status: val })}
          defaultValue="all"
        />
        <CustomDropdown
          label="Client Type"
          value={filters.client_type || 'all'}
          options={clientTypeOptions}
          onChange={(val) => onFilterChange({ client_type: val })}
          defaultValue="all"
        />
        <CustomDropdown
          label="Platform"
          value={filters.platform || 'all'}
          options={platformOptions}
          onChange={(val) => onFilterChange({ platform: val as any })}
          defaultValue="all"
        />
        <CustomDropdown
          label="Registration Date"
          value={filters.registration_date || 'all'}
          options={registrationDateOptions}
          onChange={(val) => onFilterChange({ registration_date: val as any })}
          defaultValue="all"
        />
      </div>
    </div>
  )
}