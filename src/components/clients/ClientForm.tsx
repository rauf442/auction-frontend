// frontend/src/components/clients/ClientForm.tsx
"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import { createClient, updateClient, type Client } from '@/lib/clients-api'
import { fetchBrands, type Brand } from '@/lib/api'
import PhoneInput from 'react-phone-input-2'
import { LoadScript, StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api'
import { useBrand } from '@/lib/brand-context'

interface ClientFormProps {
  mode: 'create' | 'edit'
  clientId?: number
  initialData?: Partial<Client>
  onSuccess?: (client?: Client) => void
}

// Simple validation function for client data
const validateClientData = (data: Partial<Client>): string[] => {
  const errors: string[] = []
  if (!data.first_name?.trim()) errors.push('First name is required')
  if (!data.last_name?.trim()) errors.push('Last name is required')
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Please enter a valid email address')
  return errors
}

export default function ClientForm({ mode, clientId, initialData, onSuccess }: ClientFormProps) {
  const { brand } = useBrand()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')

  const [formData, setFormData] = useState<Partial<Client>>({
    title: '',
    first_name: '',
    last_name: '',
    salutation: '',
    birth_date: '',
    preferred_language: 'English',
    time_zone: 'UTC',
    tags: '',
    email: '',
    phone_number: '',
    company_name: '',
    instagram_url: '',
    vat_number: '',
    has_no_email: false,
    vat_applicable: false,
    secondary_email: '',
    secondary_phone_number: '',
    client_type: 'buyer',
    default_vat_scheme: 'Margin scheme',
    default_ldl: 'No',
    default_consignment_charges: '',
    billing_address1: '',
    billing_address2: '',
    billing_address3: '',
    billing_city: '',
    billing_post_code: '',
    billing_country: '',
    billing_region: '',
    bank_account_details: '',
    bank_address: '',
    buyer_premium: 0,
    vendor_premium: 0,
    shipping_same_as_billing: true,
    shipping_address1: '',
    shipping_address2: '',
    shipping_address3: '',
    shipping_city: '',
    shipping_post_code: '',
    shipping_country: '',
    shipping_region: '',
    status: 'active',
    role: 'BUYER',
    paddle_no: '',
    identity_cert: 'Uncertified',
    platform: 'Private',
    brand_id: '' as any,
    // Bidder Analytics fields
    card_on_file: false,
    auctions_attended: 0,
    bids_placed: 0,
    items_won: 0,
    tax_exemption: false,
    payment_rate: 0,
    avg_hammer_price_low: 0,
    avg_hammer_price_high: 0,
    disputes_open: 0,
    disputes_closed: 0,
    bidder_notes: ''
  })
  const [brands, setBrands] = useState<Brand[]>([])
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchBrands()
        setBrands(list)
        // Only auto-select a brand when creating a new client and no initial data provided
        if (mode === 'create' && !initialData && !formData.brand_id && list.length > 0) {
          setFormData(prev => ({ ...prev, brand_id: list[0].id as any }))
        }
      } catch { }
    })()
  }, [mode, initialData])

  // Google Places refs
  const billingSearchBoxRef = useRef<google.maps.places.SearchBox | null>(null)
  const shippingSearchBoxRef = useRef<google.maps.places.SearchBox | null>(null)

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const placesLibraries = useMemo(() => ['places'] as ("places")[], [])

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: googleApiKey,
    libraries: placesLibraries,
  });

  const parsePlaceToAddress = useCallback((place: google.maps.places.PlaceResult) => {
    const components = place.address_components || []
    const find = (type: string) => components.find(c => (c.types || []).includes(type))
    const line1 = place.name || ''
    const locality = find('locality')?.long_name || find('postal_town')?.long_name || ''
    const country = find('country')?.long_name || ''
    const region = find('administrative_area_level_1')?.long_name || ''
    const postal = find('postal_code')?.long_name || ''
    return { line1, city: locality, country, region, postal }
  }, [])

  const handleBillingPlaceChanged = useCallback(() => {
    const box = billingSearchBoxRef.current
    if (!box) return
    const places = box.getPlaces()
    const place = places && places[0]
    if (!place) return
    const a = parsePlaceToAddress(place)
    setFormData(prev => ({
      ...prev,
      billing_address1: a.line1,
      billing_city: a.city,
      billing_country: a.country,
      billing_region: a.region,
      billing_post_code: a.postal,
    }))
  }, [parsePlaceToAddress])

  const handleShippingPlaceChanged = useCallback(() => {
    const box = shippingSearchBoxRef.current
    if (!box) return
    const places = box.getPlaces()
    const place = places && places[0]
    if (!place) return
    const a = parsePlaceToAddress(place)
    setFormData(prev => ({
      ...prev,
      shipping_address1: a.line1,
      shipping_city: a.city,
      shipping_country: a.country,
      shipping_region: a.region,
      shipping_post_code: a.postal,
    }))
  }, [parsePlaceToAddress])

  // Load Google Sheets URL from app settings
  useEffect(() => {
    const loadGoogleSheetUrl = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/app-settings/google-sheets/clients`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data && data.data.url) {
            setGoogleSheetUrl(data.data.url)
          }
        }
      } catch (error) {
        console.error('Error loading Google Sheets URL:', error)
      }
    }

    loadGoogleSheetUrl()
  }, [])

  // Seed initial data in edit mode
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  // Removed manual Google Sheets sync - backend handles auto-sync automatically

  const handleInputChange = (field: keyof Client, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (validationErrors.length > 0) setValidationErrors([])
  }

  // Keep shipping in sync when checkbox is true
  useEffect(() => {
    if (formData.shipping_same_as_billing) {
      setFormData(prev => ({
        ...prev,
        shipping_address1: prev.billing_address1,
        shipping_address2: prev.billing_address2,
        shipping_address3: prev.billing_address3,
        shipping_city: prev.billing_city,
        shipping_post_code: prev.billing_post_code,
        shipping_country: prev.billing_country,
        shipping_region: prev.billing_region
      }))
    }
  }, [formData.shipping_same_as_billing, formData.billing_address1, formData.billing_address2, formData.billing_address3, formData.billing_city, formData.billing_post_code, formData.billing_country, formData.billing_region])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors([])

    const errors = validateClientData(formData)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setLoading(true)

      // Step 1: Save the client
      let createdClient: Client | undefined = undefined

      if (mode === 'create') {
        const payload = { ...formData }
        // Convert empty strings to undefined for optional fields
        if (payload.instagram_url === '') payload.instagram_url = undefined
        if (payload.birth_date === '') payload.birth_date = undefined

        // Remove brand and brand_code fields to avoid schema cache error - only use brand_id
        delete (payload as any).brand
        delete (payload as any).brand_code

        // Ensure brand is set from current brand context for proper id-prefixed display computation on UI
        if (!payload.brand_id && brand) {
          // Fetch brand ID from the current brand context
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/brands?code=${brand}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (response.ok) {
              const brandData = await response.json()
              if (brandData.success && brandData.data && brandData.data.length > 0) {
                payload.brand_id = brandData.data[0].id
              }
            }
          } catch (error) {
            console.warn('Could not fetch brand ID:', error)
          }
        }

        const response = await createClient(payload as Omit<Client, 'id' | 'created_at' | 'updated_at'>)
        if (!response.success) throw new Error('Failed to create client')
        createdClient = response.data
      } else if (mode === 'edit' && clientId) {
        const payload = { ...formData }
        // Convert empty strings to undefined for optional fields
        if (payload.instagram_url === '') payload.instagram_url = undefined
        if (payload.birth_date === '') payload.birth_date = undefined

        // Remove brand and brand_code fields to avoid schema cache error - only use brand_id
        delete (payload as any).brand
        delete (payload as any).brand_code

        // Ensure brand is set from current brand context for proper id-prefixed display computation on UI
        if (!payload.brand_id && brand) {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/brands?code=${brand}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (response.ok) {
              const brandData = await response.json()
              if (brandData.success && brandData.data && brandData.data.length > 0) {
                payload.brand_id = brandData.data[0].id
              }
            }
          } catch (error) {
            console.warn('Could not fetch brand ID:', error)
          }
        }

        await updateClient(clientId, payload)
      }

      setSuccess(true)
      setTimeout(() => {
        if (onSuccess) onSuccess(createdClient)
      }, 800)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center space-x-4">
          <Link href="/clients" className="flex items-center text-white hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            All Clients
          </Link>
        </div>
        <h1 className="text-2xl font-bold mt-2">{mode === 'create' ? 'Add New Client' : 'Edit Client'}</h1>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 mx-6 mt-4 rounded-md flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 mx-6 mt-4 rounded-md">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 font-medium">Please fix the following errors:</span>
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {validationErrors.map((err, idx) => <li key={idx}>• {err}</li>)}
          </ul>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 p-4 mx-6 mt-4 rounded-md flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{mode === 'create' ? 'Client created' : 'Client updated'} successfully.</span>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={formData.title || ''} onChange={(e) => handleInputChange('title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Mr., Mrs., Dr., etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" value={formData.first_name || ''} onChange={(e) => handleInputChange('first_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" value={formData.last_name || ''} onChange={(e) => handleInputChange('last_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salutation</label>
                <select value={formData.salutation || ''} onChange={(e) => handleInputChange('salutation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="">Select salutation</option>
                  <option value="dear_sir">Dear Sir</option>
                  <option value="dear_madam">Dear Madam</option>
                  <option value="hello">Hello</option>
                  <option value="hi">Hi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                <div className="relative">
                  <input type="date" value={formData.birth_date || ''} onChange={(e) => handleInputChange('birth_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language *</label>
                <select value={formData.preferred_language || 'English'} onChange={(e) => handleInputChange('preferred_language', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="English">English</option>
                  <option value="Estonian">Estonian</option>
                  <option value="Russian">Russian</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                <select value={formData.time_zone || 'UTC'} onChange={(e) => handleInputChange('time_zone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="UTC">UTC</option>
                  <option value="EST">EST</option>
                  <option value="PST">PST</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input type="text" value={formData.tags || ''} onChange={(e) => handleInputChange('tags', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Add tags separated by commas" />
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" disabled={formData.has_no_email} />
                <div className="mt-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={formData.has_no_email || false} onChange={(e) => handleInputChange('has_no_email', e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2" />
                    <span className="text-sm text-gray-600">Client has no email</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <PhoneInput
                  country={'gb'}
                  value={formData.phone_number || ''}
                  onChange={(value) => handleInputChange('phone_number', value)}
                  inputClass="!w-full !h-auto !py-2 !text-sm !bg-white !border !border-gray-300 !rounded-md focus:!outline-none focus:!ring-2 focus:!ring-teal-500 focus:!border-transparent"
                  containerClass="!w-full"
                  enableSearch
                  disableSearchIcon
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                <input type="url" value={formData.instagram_url || ''} onChange={(e) => handleInputChange('instagram_url', e.target.value)} placeholder="https://instagram.com/username" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input type="text" value={formData.company_name || ''} onChange={(e) => handleInputChange('company_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                <input type="text" value={formData.vat_number || ''} onChange={(e) => handleInputChange('vat_number', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                <div className="mt-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={formData.vat_applicable || false} onChange={(e) => handleInputChange('vat_applicable', e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2" />
                    <span className="text-sm text-gray-600">VAT applicable</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Client Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Client Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <select
                  value={String((formData as any).brand_id || '')}
                  onChange={(e) => handleInputChange('brand_id' as any, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {brands.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Type *</label>
                <select value={formData.client_type || ''} onChange={(e) => {
                  const value = e.target.value as 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor'
                  handleInputChange('client_type', value)
                }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" required>
                  <option value="">Select client type</option>
                  <option value="buyer">Buyer</option>
                  <option value="vendor">Vendor</option>
                  <option value="buyer_vendor">Buyer and Vendor</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select value={formData.platform || 'Private'} onChange={(e) => handleInputChange('platform' as any, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="Liveauctioneer">Liveauctioneer</option>
                  <option value="The saleroom">The saleroom</option>
                  <option value="Invaluable">Invaluable</option>
                  <option value="Easylive auctions">Easylive auctions</option>
                  <option value="Private">Private</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default VAT Scheme</label>
                <select value={formData.default_vat_scheme || 'Margin scheme'} onChange={(e) => handleInputChange('default_vat_scheme', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="Margin scheme">Margin scheme</option>
                  <option value="Standard VAT">Standard VAT</option>
                  <option value="Zero VAT">Zero VAT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default LDL</label>
                <select value={formData.default_ldl || 'No'} onChange={(e) => handleInputChange('default_ldl', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input type="text" value={formData.role || ''} onChange={(e) => handleInputChange('role', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder='Assistant, Director, etc.' />
              </div>
            </div>

            {/* Premium Settings within Client Type section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-md font-medium text-gray-800 mb-4">Premium Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer's Premium (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.buyer_premium || 0}
                    onChange={(e) => handleInputChange('buyer_premium', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage charged to buyers on top of hammer price
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor's Premium (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.vendor_premium || 0}
                    onChange={(e) => handleInputChange('vendor_premium', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage deducted from hammer price for vendors
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Details</label>
                <textarea
                  value={formData.bank_account_details || ''}
                  onChange={(e) => handleInputChange('bank_account_details', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter bank account details (account number, sort code, IBAN, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Address</label>
                <textarea
                  value={formData.bank_address || ''}
                  onChange={(e) => handleInputChange('bank_address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter the bank's full address"
                />
              </div>
            </div>
          </div>

          {/* Bidder Analytics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Bidder Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card on File</label>
                <select value={formData.card_on_file ? 'true' : 'false'} onChange={(e) => handleInputChange('card_on_file', e.target.value === 'true')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Exemption</label>
                <select value={formData.tax_exemption ? 'true' : 'false'} onChange={(e) => handleInputChange('tax_exemption', e.target.value === 'true')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auctions Attended</label>
                <input type="number" min="0" value={formData.auctions_attended || 0} onChange={(e) => handleInputChange('auctions_attended', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bids Placed</label>
                <input type="number" min="0" value={formData.bids_placed || 0} onChange={(e) => handleInputChange('bids_placed', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Items Won</label>
                <input type="number" min="0" value={formData.items_won || 0} onChange={(e) => handleInputChange('items_won', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Rate (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={formData.payment_rate || 0} onChange={(e) => handleInputChange('payment_rate', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Hammer Price Low (£)</label>
                <input type="number" min="0" step="0.01" value={formData.avg_hammer_price_low || 0} onChange={(e) => handleInputChange('avg_hammer_price_low', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Hammer Price High (£)</label>
                <input type="number" min="0" step="0.01" value={formData.avg_hammer_price_high || 0} onChange={(e) => handleInputChange('avg_hammer_price_high', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disputes Open</label>
                <input type="number" min="0" value={formData.disputes_open || 0} onChange={(e) => handleInputChange('disputes_open', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disputes Closed</label>
                <input type="number" min="0" value={formData.disputes_closed || 0} onChange={(e) => handleInputChange('disputes_closed', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bidder Notes</label>
              <textarea 
                value={formData.bidder_notes || ''} 
                onChange={(e) => handleInputChange('bidder_notes', e.target.value)} 
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                placeholder="Enter any additional notes about the client's bidding behavior, preferences, or history..."
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Addresses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Billing address</h3>
                <div className="space-y-3">
                  {isLoaded && (
                    <StandaloneSearchBox onLoad={(ref) => { billingSearchBoxRef.current = ref }} onPlacesChanged={handleBillingPlaceChanged}>
                      <input type="text" placeholder="Search address or type line 1" value={formData.billing_address1 || ''} onChange={(e) => handleInputChange('billing_address1', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </StandaloneSearchBox>
                  )}
                  <input type="text" placeholder="Address line 2" value={formData.billing_address2 || ''} onChange={(e) => handleInputChange('billing_address2', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  <input type="text" placeholder="Address line 3" value={formData.billing_address3 || ''} onChange={(e) => handleInputChange('billing_address3', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="City" value={formData.billing_city || ''} onChange={(e) => handleInputChange('billing_city', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input type="text" placeholder="Post code" value={formData.billing_post_code || ''} onChange={(e) => handleInputChange('billing_post_code', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Country" value={formData.billing_country || ''} onChange={(e) => handleInputChange('billing_country', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input type="text" placeholder="Region/State" value={formData.billing_region || ''} onChange={(e) => handleInputChange('billing_region', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                  </div>


                </div>
              </div>


              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Shipping address</h3>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={formData.shipping_same_as_billing || false} onChange={(e) => handleInputChange('shipping_same_as_billing', e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                    Same as billing
                  </label>
                </div>
                <div className="space-y-3">
                  {isLoaded && (
                    <StandaloneSearchBox onLoad={(ref) => { shippingSearchBoxRef.current = ref }} onPlacesChanged={handleShippingPlaceChanged}>
                      <input type="text" placeholder="Search address or type line 1" value={formData.shipping_address1 || ''} onChange={(e) => handleInputChange('shipping_address1', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </StandaloneSearchBox>
                  )}
                  <input type="text" placeholder="Address line 2" value={formData.shipping_address2 || ''} onChange={(e) => handleInputChange('shipping_address2', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  <input type="text" placeholder="Address line 3" value={formData.shipping_address3 || ''} onChange={(e) => handleInputChange('shipping_address3', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="City" value={formData.shipping_city || ''} onChange={(e) => handleInputChange('shipping_city', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input type="text" placeholder="Post code" value={formData.shipping_post_code || ''} onChange={(e) => handleInputChange('shipping_post_code', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Country" value={formData.shipping_country || ''} onChange={(e) => handleInputChange('shipping_country', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input type="text" placeholder="Region/State" value={formData.shipping_region || ''} onChange={(e) => handleInputChange('shipping_region', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Autocomplete by postcode via Google Maps Places API can be integrated by wiring onBlur of postcode fields to a backend proxy endpoint to preserve API keys.</p>
          </div>

          {/* Submit */}
          <div className="flex justify-end items-center">
            <div className="flex space-x-4">
              <Link href="/clients" className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Cancel</Link>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Client' : 'Update Client')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}


