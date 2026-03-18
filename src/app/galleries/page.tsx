// frontend/src/app/galleries/page.tsx
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Plus, Search, Download, Edit, Trash2, Building2, Sparkles, ExternalLink, Share2, ChevronDown, X } from 'lucide-react'
import { GalleriesAPI, Gallery, GalleriesFilters } from '@/lib/galleries-api'
import ExportShareModal from '@/components/ExportShareModal'
import { useExportShare } from '@/hooks/useExportShare'
import { ListPageHeader } from '@/components/layout/ListPageHeader'

function CustomDropdown({ label, value, options, onChange, defaultValue }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  defaultValue: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.value === value)?.label || options[0]?.label
  const isFiltered = value !== defaultValue

  React.useEffect(() => {
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

interface NominatimResult {
  place_id: number
  display_name: string
  name: string
  address: {
    city?: string
    country?: string
    state?: string
  }
  lat: string
  lon: string
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([])
  const [nominatimLoading, setNominatimLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<NominatimResult | null>(null)
  const [showAddOption, setShowAddOption] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [filters, setFilters] = useState<GalleriesFilters>({
    status: 'active',
    page: 1,
    limit: 25,
    sort_field: 'name',
    sort_direction: 'asc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  })

  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [userRole] = useState<string>('admin')

  const galleryExportFields = [
    { key: 'name', label: 'Gallery Name', selected: true, required: true },
    { key: 'location', label: 'Location', selected: true },
    { key: 'country', label: 'Country', selected: true },
    { key: 'gallery_type', label: 'Type', selected: true },
    { key: 'founded_year', label: 'Founded Year', selected: false },
    { key: 'director', label: 'Director', selected: false },
    { key: 'website', label: 'Website', selected: false },
    { key: 'description', label: 'Description', selected: false },
    { key: 'specialties', label: 'Specialties', selected: false },
    { key: 'phone', label: 'Phone', selected: false },
    { key: 'email', label: 'Email', selected: false },
    { key: 'status', label: 'Status', selected: false },
    { key: 'created_at', label: 'Created Date', selected: false },
  ]

  const exportShare = useExportShare({
    title: 'Galleries Database',
    data: galleries,
    fields: galleryExportFields,
    filename: `galleries-export-${Date.now()}`,
    userRole: userRole
  })

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadGalleries()
  }, [filters])

  const loadGalleries = async () => {
    try {
      setLoading(true)
      setError(null)
      const searchFilters = { ...filters }
      if (searchTerm) searchFilters.search = searchTerm
      const response = await GalleriesAPI.getGalleries(searchFilters)
      if (response.success) {
        setGalleries(response.data)
        setPagination(response.pagination)
      } else {
        setError('Failed to load galleries')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load galleries')
    } finally {
      setLoading(false)
    }
  }

  // Search using Nominatim (OpenStreetMap) - completely free, no API key
  const searchNominatim = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setNominatimResults([])
      setShowSuggestions(false)
      return
    }

    try {
      setNominatimLoading(true)
      const response = await fetch(
  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await response.json()
      setNominatimResults(data)
setShowSuggestions(true)
    } catch (err) {
      console.error('Nominatim search error:', err)
      setNominatimResults([])
    } finally {
      setNominatimLoading(false)
    }
  }, [])

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value)
    setShowAddOption(false)
    setSelectedPlace(null)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!value) {
      setNominatimResults([])
      setShowSuggestions(false)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchNominatim(value)
    }, 400)
  }

  const handleSelectPlace = (place: NominatimResult) => {
    setSearchTerm(place.name || place.display_name.split(',')[0])
    setSelectedPlace(place)
    setShowAddOption(true)
    setShowSuggestions(false)
  }

  const handleGoogleSearch = () => {
    if (selectedPlace) {
      const name = selectedPlace.name || searchTerm
      window.open(`https://www.google.com/search?q=${encodeURIComponent(name + ' gallery')}`, '_blank')
    }
  }

  const handleAiGenerateFromPlace = async () => {
    if (!selectedPlace && !searchTerm) return
    try {
      setAiGenerating(true)
      const name = selectedPlace?.name || searchTerm
      const location = selectedPlace?.display_name || ''
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/galleries/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name, location })
      })
      if (!response.ok) throw new Error('Failed to generate AI content')
      const data = await response.json()
      if (data.success) {
        const galleryData = { ...data.data, name }
        const params = new URLSearchParams()
        Object.entries(galleryData).forEach(([key, value]) => { if (value) params.append(key, value.toString()) })
        window.location.href = `/galleries/new?${params.toString()}`
      }
    } catch (err: any) {
      toast.error(`Failed to generate gallery details: ${err.message}`)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(prev => ({ ...prev, page: 1 }))
    loadGalleries()
  }

  const handleFilterChange = (newFilters: Partial<GalleriesFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleDelete = async (galleryId: string, galleryName: string) => {
    if (!confirm(`Are you sure you want to delete "${galleryName}"?`)) return
    try {
      await GalleriesAPI.deleteGallery(galleryId)
      await loadGalleries()
    } catch (err: any) {
      toast.error(`Failed to delete gallery: ${err.message}`)
    }
  }

  const handleExport = async () => {
    try {
      await GalleriesAPI.exportCSV(filters)
    } catch (err: any) {
      toast.error(`Failed to export galleries: ${err.message}`)
    }
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' }
  ]

  const galleryTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'museum', label: 'Museum' },
    { value: 'institution', label: 'Institution' },
    { value: 'private', label: 'Private' },
    { value: 'cooperative', label: 'Cooperative' }
  ]

  const sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'location-asc', label: 'Location (A-Z)' },
    { value: 'founded_year-desc', label: 'Founded Year (Newest)' },
    { value: 'founded_year-asc', label: 'Founded Year (Oldest)' },
    { value: 'created_at-desc', label: 'Recently Added' },
  ]

  const getStatusBadge = (status: string) => {
    const colors = { active: 'bg-green-100 text-green-800', inactive: 'bg-yellow-100 text-yellow-800', archived: 'bg-gray-100 text-gray-800' }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getGalleryTypeBadge = (type: string) => {
    const colors = { commercial: 'bg-blue-100 text-blue-800', museum: 'bg-purple-100 text-purple-800', institution: 'bg-indigo-100 text-indigo-800', private: 'bg-pink-100 text-pink-800', cooperative: 'bg-teal-100 text-teal-800' }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const headerActions = [
    { label: 'Add gallery', icon: Plus, href: '/galleries/new', variant: 'primary' as const },
    { label: 'Export CSV', icon: Download, onClick: handleExport, variant: 'secondary' as const },
    ...(userRole === 'super_admin' ? [{ label: 'Export & share', icon: Share2, onClick: exportShare.openModal, variant: 'ghost' as const }] : [])
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <ListPageHeader
          eyebrow="Galleries"
          title="Global gallery intelligence"
          description="Manage gallery information, certifications, and AI-assisted research."
          stats={[
            { label: 'Total', value: pagination.total || galleries.length },
            { label: 'Showing', value: galleries.length, tone: 'info' },
            { label: 'Status', value: filters.status || 'all' }
          ]}
          actions={headerActions}
        />

        <section className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="border-b border-slate-100 px-6 py-6">
            <div className="space-y-4">

              {/* World Famous Galleries Search - Now using Nominatim */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Search World Famous Galleries</label>
                <div className="flex items-center space-x-2" ref={searchRef}>
                  <div className="flex-1 relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
                    <input
                      type="text"
                      placeholder="Search famous galleries like Louvre, MoMA, Tate Modern..."
                      value={searchTerm}
                      onChange={(e) => handleSearchTermChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {/* Nominatim Suggestions Dropdown */}
                    {showSuggestions && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        {nominatimLoading ? (
                          <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                        ) : (
                          nominatimResults.map((result) => (
                            <button
                              key={result.place_id}
                              onClick={() => handleSelectPlace(result)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {result.name || result.display_name.split(',')[0]}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{result.display_name}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {showAddOption && (
                    <>
                      <button type="button" onClick={handleGoogleSearch} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                        <ExternalLink className="h-4 w-4 mr-2" />Search
                      </button>
                      <button type="button" onClick={handleAiGenerateFromPlace} disabled={aiGenerating} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 cursor-pointer">
                        {aiGenerating ? <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div> : <Sparkles className="h-4 w-4 mr-2" />}
                        {aiGenerating ? 'Generating...' : 'Add with AI'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Search Existing Galleries */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Search Existing Galleries</label>
                <form onSubmit={handleSearch} className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search existing galleries by name, location, director..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer">Search Database</button>
                </form>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <CustomDropdown label="Status" value={filters.status || ''} options={statusOptions} onChange={(val) => handleFilterChange({ status: val || undefined })} defaultValue="" />
              </div>
              <div>
                <CustomDropdown label="Type" value={filters.gallery_type || ''} options={galleryTypeOptions} onChange={(val) => handleFilterChange({ gallery_type: val || undefined })} defaultValue="" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input type="text" placeholder="Filter by location" value={filters.location || ''} onChange={(e) => handleFilterChange({ location: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input type="text" placeholder="Filter by country" value={filters.country || ''} onChange={(e) => handleFilterChange({ country: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">{error}</div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Showing {galleries.length} of {pagination.total} galleries</p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <div className="w-48">
                  <CustomDropdown
                    label=""
                    value={`${filters.sort_field}-${filters.sort_direction}`}
                    options={sortOptions}
                    onChange={(val) => {
                      const [field, direction] = val.split('-')
                      handleFilterChange({ sort_field: field, sort_direction: direction as 'asc' | 'desc' })
                    }}
                    defaultValue="name-asc"
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          ) : galleries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No galleries found</h3>
              <p className="text-gray-600 mb-4">{searchTerm || filters.status !== 'active' ? 'Try adjusting your search or filters' : 'Get started by adding your first gallery'}</p>
              <Link href="/galleries/new" className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />Add Gallery
              </Link>
            </div>
          ) : (
            <>
              {/* TABLE VIEW - large screens */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gallery</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Director</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {galleries.map((gallery) => (
                      <tr key={gallery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{gallery.name}</div>
                          {gallery.website && <div className="text-sm text-gray-500"><a href={gallery.website} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600">{gallery.website}</a></div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGalleryTypeBadge(gallery.gallery_type || '')}`}>{gallery.gallery_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{gallery.location}{gallery.country && gallery.location && ', '}{gallery.country}</div>
                          {gallery.founded_year && <div className="text-sm text-gray-500">Founded {gallery.founded_year}</div>}
                        </td>
                        <td className="px-6 py-4"><div className="text-sm text-gray-900">{gallery.director}</div></td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(gallery.status || 'active')}`}>{gallery.status}</span>
                          {gallery.is_verified && <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Verified</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link href={`/galleries/edit/${gallery.id}`} className="text-teal-600 hover:text-teal-900"><Edit className="h-4 w-4" /></Link>
                            <button onClick={() => handleDelete(gallery.id!, gallery.name)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CARD VIEW - smaller screens */}
              <div className="xl:hidden divide-y divide-gray-200">
                {galleries.map((gallery) => (
                  <div key={gallery.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-900">{gallery.name}</span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getGalleryTypeBadge(gallery.gallery_type || '')}`}>{gallery.gallery_type}</span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(gallery.status || 'active')}`}>{gallery.status}</span>
                          {gallery.is_verified && <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Verified</span>}
                        </div>
                        {gallery.website && <a href={gallery.website} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline block truncate mb-2">{gallery.website}</a>}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                          {(gallery.location || gallery.country) && <div><span className="font-medium text-gray-500">Location: </span>{gallery.location}{gallery.country && gallery.location && ', '}{gallery.country}</div>}
                          {gallery.founded_year && <div><span className="font-medium text-gray-500">Founded: </span>{gallery.founded_year}</div>}
                          {gallery.director && <div className="col-span-2"><span className="font-medium text-gray-500">Director: </span>{gallery.director}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/galleries/edit/${gallery.id}`} className="p-1.5 text-teal-600 hover:text-teal-900 hover:bg-teal-50 rounded"><Edit className="h-4 w-4" /></Link>
                        <button onClick={() => handleDelete(gallery.id!, gallery.name)} className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleFilterChange({ page: Math.max(1, pagination.page - 1) })} disabled={pagination.page === 1} className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                    <button onClick={() => handleFilterChange({ page: Math.min(pagination.pages, pagination.page + 1) })} disabled={pagination.page === pagination.pages} className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <ExportShareModal
          isOpen={exportShare.isModalOpen}
          onClose={exportShare.closeModal}
          title={exportShare.config.title}
          data={exportShare.config.data}
          availableFields={exportShare.config.fields}
          onExport={exportShare.handleExport}
          onPrint={exportShare.handlePrint}
          onShare={exportShare.handleShare}
          userRole={userRole}
        />
      </div>
    </div>
  )
}