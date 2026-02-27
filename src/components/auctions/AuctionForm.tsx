// frontend/src/components/auctions/AuctionForm.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Minus, ChevronDown, ChevronUp, Clock, Calendar, Info, DollarSign, Save, X, AlertCircle, Search, Image, Trash2, Check } from 'lucide-react'
import { createAuction, updateAuction, getBrandAuctionCounts, type BrandAuctionCounts, type Brand } from '@/lib/auctions-api'
import { ArtworksAPI, type Artwork } from '@/lib/items-api'
import type { Auction } from '@/lib/auctions-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  AUCTION_PLATFORMS,
  AUCTION_TYPES,
  AUCTION_SUBTYPES,
  SORTING_MODES,
  ESTIMATES_VISIBILITY,
  TIME_ZONES
} from '@/lib/constants'

// Modern UI Components with better styling
const Label = ({ htmlFor, className, children, required }: {
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label htmlFor={htmlFor} className={`block text-sm font-semibold text-gray-700 mb-2 ${className}`}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

const Input = ({ id, type = "text", value, onChange, className, required, min, placeholder, icon, step }: {
  id?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  required?: boolean;
  min?: string;
  placeholder?: string;
  icon?: React.ElementType;
  step?: string;
}) => {
  const IconComponent = icon
  return (
    <div className="relative">
      {IconComponent && (
        <IconComponent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full ${IconComponent ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${className}`}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
      />
    </div>
  )
}

const Textarea = ({ id, value, onChange, className, placeholder, rows, required }: {
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) => (
  <textarea
    id={id}
    value={value}
    onChange={onChange}
    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none ${className}`}
    placeholder={placeholder}
    rows={rows}
    required={required}
  />
)

const Select = ({ value, onValueChange, children, className }: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${className}`}
  >
    {children}
  </select>
)

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
)

const Button = ({ type = "button", variant = "primary", onClick, disabled, className, children, icon }: {
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "outline";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) => {
  const baseClasses = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    outline: "border-2 border-gray-300 hover:border-gray-400 text-gray-700 bg-white focus:ring-gray-500"
  }

  const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-current"

  const IconComponent = icon

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {IconComponent && <IconComponent className="w-5 h-5 mr-2" />}
      {children}
    </button>
  )
}

interface AuctionFormProps {
  auction?: Auction;
  onSave?: (auction: Auction) => void;
  onCancel?: () => void;
  initialSelectedArtworks?: number[];
}

// Helper function to convert API date format to datetime-local format
const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    // Convert to local timezone format for datetime-local input
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

export default function AuctionForm({ auction, onSave, onCancel, initialSelectedArtworks = [] }: AuctionFormProps) {
  const [formData, setFormData] = useState<{
    type: string;
    subtype: string;
    short_name: string;
    long_name: string;
    target_reserve: number;
    specialist_id: number | null;
    description: string;
    important_notice: string;
    title_image_url: string;
    catalogue_launch_date: string;
    aftersale_deadline: string;
    shipping_date: string;
    settlement_date: string;
    auction_days: any[];
    sale_events: any[];
    auctioneer_declaration: string;
    bid_value_increments: string;
    sorting_mode: string;
    estimates_visibility: string;
    time_zone: string;
    platform: string;
    brand_id?: number;
    upload_status: string;
    // Platform URLs
    liveauctioneers_url: string;
    easy_live_url: string;
    invaluable_url: string;
    the_saleroom_url: string;
  }>({
    type: auction?.type || 'sealed_bid',
    subtype: auction?.subtype || 'actual',
    short_name: auction?.short_name || '',
    long_name: auction?.long_name || '',
    target_reserve: auction?.target_reserve || 0,
    specialist_id: auction?.specialist_id || null,
    description: auction?.description || '',
    important_notice: auction?.important_notice || '',
    title_image_url: auction?.title_image_url || '',
    catalogue_launch_date: formatDateForInput(auction?.catalogue_launch_date),
    aftersale_deadline: formatDateForInput(auction?.aftersale_deadline),
    shipping_date: formatDateForInput(auction?.shipping_date),
    settlement_date: formatDateForInput(auction?.settlement_date),
    auction_days: auction?.auction_days || [{ day: 1, date: '', start_time: '', end_time: '', first_lot: 1, description: '' }],
    sale_events: auction?.sale_events || [],
    auctioneer_declaration: auction?.auctioneer_declaration || '',
    bid_value_increments: auction?.bid_value_increments || '10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200',
    sorting_mode: auction?.sorting_mode || 'standard',
    estimates_visibility: auction?.estimates_visibility || 'use_global',
    time_zone: auction?.time_zone || 'UTC',
    platform: auction?.platform || 'liveauctioneers',
    brand_id: auction?.brand_id || auction?.brand?.id,
    upload_status: auction?.upload_status || 'not_uploaded',
    // Platform URLs
    liveauctioneers_url: auction?.liveauctioneers_url || '',
    easy_live_url: auction?.easy_live_url || '',
    invaluable_url: auction?.invaluable_url || '',
    the_saleroom_url: auction?.the_saleroom_url || ''
  })

  interface User {
    id: number
    email: string
    first_name: string
    last_name: string
    role: string
    position?: string
  }

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [brandAuctionCounts, setBrandAuctionCounts] = useState<BrandAuctionCounts>({})

  // Artwork selection state
  const [selectedArtworks, setSelectedArtworks] = useState<number[]>(
    auction?.artwork_ids || initialSelectedArtworks || []
  )
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artworkSearchQuery, setArtworkSearchQuery] = useState('')
  const [artworksLoading, setArtworksLoading] = useState(false)
  const [showArtworkSearch, setShowArtworkSearch] = useState(false)

  // Load artworks when component mounts or search query changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [usersResponse, brandsResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(res => res.json()),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/brands`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(res => res.json())
        ])
        setUsers(usersResponse.users || [])
        setBrands(brandsResponse.data || brandsResponse.brands || [])

        // Load auction counts for each brand
        const brandList: Brand[] = (brandsResponse.data || brandsResponse.brands || []).map((brand: any) => ({
          id: brand.id,
          code: brand.code,
          name: brand.name
        }));
        const auctionCounts = await getBrandAuctionCounts(brandList);
        setBrandAuctionCounts(auctionCounts)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    loadArtworks()
  }, [artworkSearchQuery])

  // Update short name when brand changes (only for new auctions)
  useEffect(() => {
    // Only auto-fill for new auctions (not editing existing ones)
    if (auction?.id) return

    if (formData.brand_id && brands.length > 0 && Object.keys(brandAuctionCounts).length > 0) {
      const selectedBrand = brands.find(b => b.id === parseInt(formData.brand_id!.toString()))
      if (selectedBrand) {
        const auctionCount = brandAuctionCounts[selectedBrand.id] || 0
        const nextAuctionNumber = auctionCount + 1
        const suggestedShortName = `${selectedBrand.code} ${nextAuctionNumber}`

        // Only set if the field is empty or matches the current pattern
        if (!formData.short_name || formData.short_name.trim() === '' ||
            /^\w+\s+\d+$/.test(formData.short_name)) {
          setFormData(prev => ({
            ...prev,
            short_name: suggestedShortName
          }))
        }
      }
    }
  }, [formData.brand_id, brands, brandAuctionCounts, auction?.id, formData.short_name])

  const loadArtworks = async () => {
    try {
      setArtworksLoading(true)
      console.log('Loading artworks with params:', {
        search: artworkSearchQuery,
        limit: 100,
        status: 'all', // Changed from 'active' to 'all' to include all artwork statuses
        // brand_code: formData.brand_code
      })
      const response = await ArtworksAPI.getArtworks({
        search: artworkSearchQuery,
        limit: 100,
        status: 'all', // Include all statuses for auction artwork selection
        // brand_code: formData.brand_code
      })
      console.log('Artworks response:', response)
      setArtworks(response.data || [])
    } catch (error) {
      console.error('Error loading artworks:', error)
      setArtworks([]) // Set empty array on error
    } finally {
      setArtworksLoading(false)
    }
  }

  const toggleArtworkSelection = (artworkId: number) => {
    setSelectedArtworks(prev =>
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  const removeSelectedArtwork = (artworkId: number) => {
    setSelectedArtworks(prev => prev.filter(id => id !== artworkId))
  }

  const getSelectedArtworkDetails = () => {
    return artworks.filter(artwork => selectedArtworks.includes(Number(artwork.id!)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Include artwork_ids in the form data
      const submissionData = {
        ...formData,
        artwork_ids: selectedArtworks,
        type: formData.type as 'timed' | 'live' | 'sealed_bid',
        subtype: formData.subtype as 'actual' | 'post_sale_platform' | 'post_sale_private' | 'free_timed',
        sorting_mode: formData.sorting_mode as 'standard' | 'automatic' | 'manual',
        estimates_visibility: formData.estimates_visibility as 'use_global' | 'show_always' | 'do_not_show'
      }

      let savedAuction
      if (auction?.id) {
        savedAuction = await updateAuction(auction.id.toString(), submissionData)
      } else {
        savedAuction = await createAuction(submissionData)
      }

      onSave?.(savedAuction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save auction')
    } finally {
      setLoading(false)
    }
  }

  const addAuctionDay = () => {
    setFormData(prev => ({
      ...prev,
      auction_days: [...prev.auction_days, {
        day: prev.auction_days.length + 1,
        date: '',
        start_time: '',
        end_time: '',
        first_lot: 1,
        description: ''
      }]
    }))
  }

  const removeAuctionDay = (index: number) => {
    setFormData(prev => ({
      ...prev,
      auction_days: prev.auction_days.filter((_, i) => i !== index)
    }))
  }

  const updateAuctionDay = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      auction_days: prev.auction_days.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      )
    }))
  }

  const addSaleEvent = () => {
    setFormData(prev => ({
      ...prev,
      sale_events: [...prev.sale_events, {
        type: 'pickup',
        date: '',
        start_time: '',
        end_time: '',
        description: ''
      }]
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <X className="h-5 w-5" />
            <span>Back to Auctions</span>
          </button>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {auction ? 'Edit Auction' : 'Create New Auction'}
              </h1>
              <p className="text-gray-600 mt-1">
                {auction ? 'Update auction details and settings' : 'Set up a new auction with all the necessary details'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center space-x-3">
                <Info className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Auction Type Selection */}
              <div>
                <Label required>Auction Type</Label>
                <div className="grid grid-cols-3 gap-4">
                  {AUCTION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                      className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${formData.type === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auction Subtype - Only show for timed and live auctions */}
              {(formData.type === 'timed' || formData.type === 'live') && (
                <div>
                  <Label required>Auction Subtype</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {AUCTION_SUBTYPES.map((subtype) => (
                      <button
                        key={subtype.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, subtype: subtype.value }))}
                        className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                          formData.subtype === subtype.value
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-semibold text-sm">{subtype.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{subtype.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="short_name" required>Short Name</Label>
                  <Input
                    id="short_name"
                    value={formData.short_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                    placeholder={formData.brand_id ? `e.g., Aurum 5` : "Select brand first for auto-suggestion"}
                    required
                  />
                  {formData.brand_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-suggested based on brand auction count
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="long_name" required>Long Name</Label>
                  <Input
                    id="long_name"
                    value={formData.long_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, long_name: e.target.value }))}
                    placeholder="e.g., Winter Contemporary Art Sale 2024"
                    required
                  />
                </div>
              </div>

              {/* Target Reserve, Specialist, Platform, Brand and Upload Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="target_reserve">Target Reserve</Label>
                  <Input
                    id="target_reserve"
                    type="number"
                    step="0.01"
                    value={formData.target_reserve}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_reserve: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    icon={DollarSign}
                  />
                </div>
                <div>
                  <Label htmlFor="specialist">Specialist In Charge</Label>
                  <SearchableSelect
                    value={formData.specialist_id?.toString() || ''}
                    onChange={(val) => setFormData(prev => ({
                      ...prev,
                      specialist_id: val && val !== '' ? parseInt(val.toString()) : null
                    }))}
                    options={[
                      { value: '', label: 'No specialist assigned' },
                      ...users.map((user) => ({
                        value: user.id.toString(),
                        label: `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
                      }))
                    ]}
                    placeholder="Type to search specialists"
                  />

                </div>
                <div>
                  <Label htmlFor="platform">Auction Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
                  >
                    {AUCTION_PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="brand_id">Brand</Label>
                  <Select
                    value={formData.brand_id?.toString() || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, brand_id: value ? parseInt(value) : undefined }))}
                  >
                    <SelectItem value="">No brand selected</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="upload_status">Upload Status</Label>
                  <Select
                    value={formData.upload_status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, upload_status: value }))}
                  >
                    <SelectItem value="not_uploaded">Not Uploaded</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Platform URLs */}
              <div>
                <Label>Platform URLs</Label>
                <div className="space-y-4">
                  {formData.type === 'timed' && (
                    <div>
                      <Label htmlFor={`${formData.platform}_url`} className="text-sm font-medium">
                        {formData.platform.charAt(0).toUpperCase() + formData.platform.slice(1).replace('_', ' ')} URL
                      </Label>
                      <Input
                        id={`${formData.platform}_url`}
                        value={formData[`${formData.platform}_url` as keyof typeof formData] as string || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [`${formData.platform}_url`]: e.target.value }))}
                        placeholder={`Enter ${formData.platform.replace('_', ' ')} auction URL`}
                        type="url"
                      />
                    </div>
                  )}

                  {formData.type === 'live' && (
                    <>
                      <div>
                        <Label htmlFor="liveauctioneers_url" className="text-sm font-medium">LiveAuctioneers URL</Label>
                        <Input
                          id="liveauctioneers_url"
                          value={formData.liveauctioneers_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, liveauctioneers_url: e.target.value }))}
                          placeholder="Enter LiveAuctioneers auction URL"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="easy_live_url" className="text-sm font-medium">EasyLive URL</Label>
                        <Input
                          id="easy_live_url"
                          value={formData.easy_live_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, easy_live_url: e.target.value }))}
                          placeholder="Enter EasyLive auction URL"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="invaluable_url" className="text-sm font-medium">Invaluable URL</Label>
                        <Input
                          id="invaluable_url"
                          value={formData.invaluable_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, invaluable_url: e.target.value }))}
                          placeholder="Enter Invaluable auction URL"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="the_saleroom_url" className="text-sm font-medium">The Saleroom URL</Label>
                        <Input
                          id="the_saleroom_url"
                          value={formData.the_saleroom_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, the_saleroom_url: e.target.value }))}
                          placeholder="Enter The Saleroom auction URL"
                          type="url"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Provide a detailed description of the auction..."
                />
              </div>

              {/* Important Notice */}
              <div>
                <Label htmlFor="important_notice">Important Notice</Label>
                <Textarea
                  id="important_notice"
                  value={formData.important_notice}
                  onChange={(e) => setFormData(prev => ({ ...prev, important_notice: e.target.value }))}
                  rows={2}
                  placeholder="Any important notices for bidders..."
                />
              </div>
            </div>
          </div>

          {/* Key Dates Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Important Dates</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="catalogue_launch">Catalogue Launch</Label>
                  <Input
                    id="catalogue_launch"
                    type="datetime-local"
                    value={formData.catalogue_launch_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, catalogue_launch_date: e.target.value }))}
                    icon={Clock}
                  />
                </div>
                <div>
                  <Label htmlFor="aftersale_deadline">Aftersale Deadline</Label>
                  <Input
                    id="aftersale_deadline"
                    type="datetime-local"
                    value={formData.aftersale_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, aftersale_deadline: e.target.value }))}
                    icon={Clock}
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_date">Shipping Date</Label>
                  <Input
                    id="shipping_date"
                    type="datetime-local"
                    value={formData.shipping_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_date: e.target.value }))}
                    icon={Clock}
                  />
                </div>
                <div>
                  <Label htmlFor="settlement_date" required>Settlement Date</Label>
                  <Input
                    id="settlement_date"
                    type="datetime-local"
                    value={formData.settlement_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, settlement_date: e.target.value }))}
                    required
                    icon={Clock}
                  />
                  <p className="text-sm text-amber-600 mt-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Settlement date is required for all auctions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Auction Days Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Auction Days</h2>
                </div>
                <Button
                  type="button"
                  onClick={addAuctionDay}
                  variant="outline"
                  icon={Plus}
                  className="!py-2 !px-4 !text-sm"
                >
                  Add Day
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {formData.auction_days.map((day, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Day {day.day}</h3>
                    {formData.auction_days.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeAuctionDay(index)}
                        variant="danger"
                        icon={Minus}
                        className="!py-2 !px-4 !text-sm"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label required>Date</Label>
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) => updateAuctionDay(index, 'date', e.target.value)}
                        required
                        icon={Calendar}
                      />
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={day.start_time}
                        onChange={(e) => updateAuctionDay(index, 'start_time', e.target.value)}
                        icon={Clock}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => updateAuctionDay(index, 'end_time', e.target.value)}
                        icon={Clock}
                      />
                    </div>
                    <div>
                      <Label>First Lot Number</Label>
                      <Input
                        type="number"
                        min="1"
                        value={day.first_lot}
                        onChange={(e) => updateAuctionDay(index, 'first_lot', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Day Description</Label>
                    <Textarea
                      value={day.description}
                      onChange={(e) => updateAuctionDay(index, 'description', e.target.value)}
                      rows={2}
                      placeholder="Optional description for this auction day..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Artwork Selection Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image className="h-6 w-6 text-amber-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Auction Artworks</h2>
                  <span className="bg-amber-100 text-amber-800 text-sm font-medium px-2 py-1 rounded-full">
                    {selectedArtworks.length} selected
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowArtworkSearch(!showArtworkSearch)}
                  variant="outline"
                  icon={showArtworkSearch ? X : Plus}
                  className="!py-2 !px-4 !text-sm"
                >
                  {showArtworkSearch ? 'Close Search' : 'Add Inventory'}
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Artwork Search */}
              {showArtworkSearch && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="mb-4">
                    <Label>Search and Select Artworks</Label>
                    <SearchableSelect
                      options={artworks.map(artwork => ({
                        value: artwork.id!,
                        label: artwork.title,
                        description: `Lot #${artwork.lot_num} • Est: £${artwork.low_est}-${artwork.high_est}`
                      }))}
                      placeholder="Select artwork to add..."
                      onChange={(artworkId) => {
                        const numericId = Number(artworkId);
                        if (!selectedArtworks.includes(numericId)) {
                          setSelectedArtworks(prev => [...prev, numericId]);
                        }
                      }}
                      inputPlaceholder="Type to search by title, artist, lot number..."
                    />
                  </div>

                  {artworksLoading && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2 text-sm">Loading artworks...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Artworks */}
              {selectedArtworks.length > 0 && (
                <div>
                  <Label>Selected Artworks ({selectedArtworks.length})</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {getSelectedArtworkDetails().map((artwork) => (
                      <div key={artwork.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{artwork.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Lot #{artwork.lot_num}
                            </p>
                            <p className="text-sm text-gray-600">
                              Est: £{artwork.low_est}-{artwork.high_est}
                            </p>
                            {artwork.description && (
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                {artwork.description}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedArtwork(Number(artwork.id!))}
                            className="ml-2 p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedArtworks.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click "Add Inventory" to browse and select artworks for this auction.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:from-gray-100 hover:to-slate-100 transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <ChevronDown className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                <h2 className="text-xl font-semibold text-gray-900">Advanced Settings</h2>
              </div>
            </button>

            {isAdvancedOpen && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="sorting_mode">Sorting Mode</Label>
                    <Select
                      value={formData.sorting_mode}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sorting_mode: value as 'standard' | 'automatic' | 'manual' }))}
                    >
                      {SORTING_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimates_visibility">Estimates Visibility</Label>
                    <Select
                      value={formData.estimates_visibility}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, estimates_visibility: value as 'use_global' | 'show_always' | 'do_not_show' }))}
                    >
                      {ESTIMATES_VISIBILITY.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bid_value_increments">Bid Value Increments</Label>
                  <Textarea
                    id="bid_value_increments"
                    value={formData.bid_value_increments}
                    onChange={(e) => setFormData(prev => ({ ...prev, bid_value_increments: e.target.value }))}
                    rows={3}
                    placeholder="Enter comma-separated bid increment values..."
                  />
                </div>

                <div>
                  <Label htmlFor="auctioneer_declaration">Auctioneer Declaration</Label>
                  <Textarea
                    id="auctioneer_declaration"
                    value={formData.auctioneer_declaration}
                    onChange={(e) => setFormData(prev => ({ ...prev, auctioneer_declaration: e.target.value }))}
                    rows={3}
                    placeholder="Auctioneer's terms and conditions..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              icon={X}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              icon={Save}
              className="min-w-[140px]"
            >
              {loading ? 'Saving...' : (auction ? 'Update Auction' : 'Create Auction')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 