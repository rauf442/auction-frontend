// frontend/src/components/ui/SearchableSelect.tsx
"use client"

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'

export interface SearchableOption<T = string | number> {
  value: T
  label: string
  description?: string
}

interface SearchableSelectProps<T = string | number> {
  value?: T
  options: SearchableOption<T>[]
  placeholder?: string
  onChange?: (value: T) => void
  disabled?: boolean
  className?: string
  inputPlaceholder?: string
  isLoading?: boolean
  onSearch?: (query: string) => Promise<SearchableOption<T>[]>
  enableDynamicSearch?: boolean
}

// Purpose: Reusable dropdown with type-to-search and clickable options
export default function SearchableSelect<T = string | number>({
  value,
  options,
  placeholder = 'Select...',
  onChange,
  disabled,
  className,
  inputPlaceholder = 'Type to search...',
  isLoading = false,
  onSearch,
  enableDynamicSearch = false
}: SearchableSelectProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dynamicOptions, setDynamicOptions] = useState<SearchableOption<T>[]>([])
  const [loading, setLoading] = useState(false)
  const componentRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const filtered = useMemo(() => {
    if (enableDynamicSearch && query.trim() && dynamicOptions.length > 0) {
      return dynamicOptions
    }
    if (!query.trim()) return options
    if (enableDynamicSearch && query.trim() && dynamicOptions.length === 0 && !loading) {
      // If we have a query but no dynamic results and not loading, show static options filtered
      const q = query.toLowerCase()
      return options.filter((o) => o.label.toLowerCase().includes(q) || (o.description?.toLowerCase().includes(q) ?? false))
    }
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.description?.toLowerCase().includes(q) ?? false))
  }, [options, query, dynamicOptions, enableDynamicSearch, loading])

  const currentLabel = useMemo(() => {
    if (!value) return null
    const found = options.find(o => String(o.value) === String(value))
    return found?.label || `Selected: ${value}`
  }, [options, value])

  // Dynamic search handler with debouncing
  const handleDynamicSearch = useCallback(async (searchQuery: string) => {
    if (!enableDynamicSearch || !onSearch) {
      setDynamicOptions([])
      return
    }

    // For very short queries, clear dynamic options to show static options
    if (searchQuery.trim().length === 0) {
      setDynamicOptions([])
      return
    }

    setLoading(true)
    try {
      const results = await onSearch(searchQuery.trim())
      setDynamicOptions(results)
    } catch (error) {
      console.error('Search error:', error)
      setDynamicOptions([])
    } finally {
      setLoading(false)
    }
  }, [enableDynamicSearch, onSearch])

  // Handle query changes with debouncing
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (enableDynamicSearch) {
      searchTimeoutRef.current = setTimeout(() => {
        handleDynamicSearch(newQuery)
        // Also trigger onChange callback for real-time filtering
        if (onChange && newQuery.trim()) {
          onChange(newQuery.trim() as T)
        }
      }, 300) // 300ms debounce
    }
  }, [enableDynamicSearch, handleDynamicSearch, onChange])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setOpen(false)
        // Keep current query and dynamic options when closing dropdown
        // Don't clear the search term - user might want to continue searching
        setDynamicOptions([])
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div ref={componentRef} className={`relative ${className || ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-3 py-2 border rounded-md text-left overflow-hidden transition-all duration-200 ease-in-out hover:shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'} border-gray-300 bg-white`}
      >
        <span className="truncate block min-w-0 text-gray-900">
          {currentLabel || placeholder}
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl ring-1 ring-black ring-opacity-5"
            style={{
              top: componentRef.current?.getBoundingClientRect().bottom || 0,
              left: componentRef.current?.getBoundingClientRect().left || 0,
              width: componentRef.current?.getBoundingClientRect().width || 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {loading && (
              <div className="text-xs text-gray-500 mt-1">Searching...</div>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {isLoading && (
              <div className="px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Loading options...
              </div>
            )}
            {!isLoading && filtered.length === 0 && query.trim() && (
              <div className="px-3 py-2 text-sm text-gray-500">No results found for "{query}"</div>
            )}
            {!isLoading && filtered.length === 0 && !query.trim() && options.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
            )}
            {!isLoading && filtered.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  console.log('Option clicked:', opt.value, opt.label)
                  setOpen(false);
                  setQuery('');
                  onChange?.(opt.value)
                }}
                className={`w-full text-left px-3 py-3 transition-colors duration-150 ease-in-out hover:bg-blue-50 hover:text-blue-900 cursor-pointer border-b border-gray-50 last:border-b-0 ${String(value) === String(opt.value) ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                {opt.description && (
                  <div className={`text-xs mt-1 ${String(value) === String(opt.value) ? 'text-blue-700' : 'text-gray-500'}`}>{opt.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
        </div>
      )}
    </div>
  )
}


