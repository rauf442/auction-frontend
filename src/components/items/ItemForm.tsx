// frontend/src/components/items/ItemForm.tsx
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Save, X, Upload, Trash2, Plus, Sparkles } from 'lucide-react'
import { Artwork, ArtworksAPI, validateArtworkData, generateStartPrice, generateReservePriceForAI, ITEM_CATEGORIES, ITEM_PERIODS, ITEM_MATERIALS, ITEM_CONDITIONS } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { SchoolsAPI, School } from '@/lib/schools-api'
import { getAuctions, Auction } from '@/lib/auctions-api'
import { fetchClients, Client, getClientDisplayName, formatClientDisplay } from '@/lib/clients-api'
import { getConsignments, type Consignment } from '@/lib/consignments-api'
import { GalleriesAPI, Gallery } from '@/lib/galleries-api'
import { getBrands, Brand } from '@/lib/brands-api'
import { useBrand } from '@/lib/brand-context'
import UsersAPI, { User } from '@/lib/users-api'
import ImageUploadField from './ImageUploadField'
import SearchableSelect, { SearchableOption } from '@/components/ui/SearchableSelect'
import { createClient } from '@/lib/supabase/client'
import ArtistSchoolSelection from '@/components/items/common/ArtistSchoolSelection'
import ArtworkDescriptionSection from '@/components/items/common/ArtworkDescriptionSection'
import DimensionsSection from '@/components/items/common/DimensionsSection'
import CertificationSection from '@/components/items/common/CertificationSection'
import AISuggestionsModal from '@/components/items/AISuggestionsModal'
import AIAutoFillModal from './AIAutoFillModal'

interface ItemFormProps {
  itemId?: string
  initialData?: Partial<Artwork>
  mode: 'create' | 'edit'
  onSave?: (artwork: Artwork) => void
  onCancel?: () => void
}

interface FormData {
  // LiveAuctioneers required fields
  title: string
  description: string
  low_est: string
  high_est: string
  start_price: string

  // LiveAuctioneers optional fields
  condition: string
  reserve: string

  // Enhanced client fields (using database field names)
  vendor_id: string
  buyer_id: string

  // Consignment field
  consignment_id: string

  // Additional auction management fields
  status: 'draft' | 'active' | 'sold' | 'withdrawn' | 'passed' | 'returned'
  category: string
  subcategory: string
  weight: string
  materials: string
  artist_id: string
  school_id: string
  period_age: string
  provenance: string

  // Enhanced artwork fields
  artwork_subject: string
  signature_placement: string
  medium: string

  // Description enhancement fields
  include_artist_description: boolean
  include_artist_key_description: boolean
  include_artist_biography: boolean
  include_artist_notable_works: boolean
  include_artist_major_exhibitions: boolean
  include_artist_awards_honors: boolean
  include_artist_market_value_range: boolean
  include_artist_signature_style: boolean

  // New dimension fields with unit conversion
  height_inches: string
  width_inches: string
  height_cm: string
  width_cm: string
  height_with_frame_inches: string
  width_with_frame_inches: string
  height_with_frame_cm: string
  width_with_frame_cm: string

  // New certification fields
  condition_report: string
  gallery_certification: boolean
  gallery_certification_file: string
  gallery_id: string
  artist_certification: boolean
  artist_certification_file: string
  certified_artist_id: string
  artist_family_certification: boolean
  artist_family_certification_file: string
  restoration_done: boolean
  restoration_done_file: string
  restoration_by: string

  // Brand field
  brand_id: string

  // Return fields
  return_date: string
  return_location: string
  return_reason: string
  returned_by_user_id: string
  returned_by_user_name: string

  // Images array (unlimited images)
  images: string[]
}

const initialFormData: FormData = {
  title: '',
  description: '',
  low_est: '',
  high_est: '',
  start_price: '',
  condition: '',
  reserve: '',
  vendor_id: '',
  buyer_id: '',
  consignment_id: '',
  status: 'draft',
  category: '',
  subcategory: '',
  height_inches: '',
  width_inches: '',
  height_cm: '',
  width_cm: '',
  height_with_frame_inches: '',
  width_with_frame_inches: '',
  height_with_frame_cm: '',
  width_with_frame_cm: '',
  weight: '',
  materials: '',
  artist_id: '',
  school_id: '',
  period_age: '',
  provenance: '',
  artwork_subject: '',
  signature_placement: '',
  medium: '',
  include_artist_description: true,
  include_artist_key_description: true,
  include_artist_biography: false,
  include_artist_notable_works: false,
  include_artist_major_exhibitions: false,
  include_artist_awards_honors: false,
  include_artist_market_value_range: false,
  include_artist_signature_style: false,
  condition_report: '',
  gallery_certification: false,
  gallery_certification_file: '',
  gallery_id: '',
  artist_certification: false,
  artist_certification_file: '',
  certified_artist_id: '',
  artist_family_certification: false,
  artist_family_certification_file: '',
  restoration_done: false,
  restoration_done_file: '',
  restoration_by: '',
  brand_id: '',
  return_date: '',
  return_location: '',
  return_reason: '',
  returned_by_user_id: '',
  returned_by_user_name: '',
  images: []
}

// Removed ImageFieldKey type - now using images array

// Utility functions for dimension conversion
const convertInchesToCm = (inchStr: string): string => {
  // Parse dimensions like "24 x 36" or "24" x 36"" and convert to cm
  const converted = inchStr.replace(/(\d+(?:\.\d+)?)\s*[\"']?\s*/g, (match, number) => {
    const inches = parseFloat(number)
    const cm = Math.round(inches * 2.54 * 10) / 10 // Round to 1 decimal place
    return cm.toString()
  })
  return converted.replace(/x/g, 'x').replace(/"/g, '').replace(/'/g, '') + ' cm'
}

const convertCmToInches = (cmStr: string): string => {
  // Parse dimensions like "61 x 91 cm" and convert to inches
  const converted = cmStr.replace(/(\d+(?:\.\d+)?)\s*/g, (match, number) => {
    const cm = parseFloat(number)
    const inches = Math.round(cm / 2.54 * 10) / 10 // Round to 1 decimal place
    return inches.toString()
  })
  return converted.replace(/cm/g, '').replace(/x/g, 'x').trim() + '"'
}

// Convert categories to SearchableOption format
const categoryOptions = ITEM_CATEGORIES.map(category => ({
  value: category,
  label: category
}))

// Convert conditions to SearchableOption format
const conditionOptions = ITEM_CONDITIONS.map(condition => ({
  value: condition.toLowerCase().replace(/\s+/g, ''),
  label: condition
}))

// Convert periods to SearchableOption format
const periodOptions = ITEM_PERIODS.map(period => ({
  value: period,
  label: period
}))

// Convert materials to SearchableOption format
const materialOptions = ITEM_MATERIALS.map(material => ({
  value: material,
  label: material
}))

const statuses = [
  { value: 'draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-800' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-red-100 text-red-800' },
  { value: 'passed', label: 'Passed', color: 'bg-gray-100 text-gray-800' },
  { value: 'returned', label: 'Returned', color: 'bg-orange-100 text-orange-800' }
]

export default function ItemForm({ itemId, initialData, mode, onSave, onCancel }: ItemFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { brand } = useBrand()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingArtistsSchools, setLoadingArtistsSchools] = useState(false)
  const [loadingAuctions, setLoadingAuctions] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
const [aiFilled, setAiFilled] = useState(false)

  // Get brand ID from brand code
  const getBrandId = (brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingConsignments, setLoadingConsignments] = useState(false)
  const [loadingGalleries, setLoadingGalleries] = useState(false)
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({})
  const [pendingCertificationFiles, setPendingCertificationFiles] = useState<Record<string, File>>({})
  
  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [aiSuggestions, setAISuggestions] = useState<any>(null)
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)

  // Load artists, schools, auctions, clients and consignments data
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoadingArtistsSchools(true)
        setLoadingAuctions(true)
        setLoadingClients(true)
        setLoadingConsignments(true)
        setLoadingGalleries(true)
        setLoadingBrands(true)
        setLoadingUsers(true)

        const [artistsResponse, schoolsResponse, auctionsResponse, clientsResponse, consignmentsResponse, galleriesResponse, brandsResponse, usersResponse] = await Promise.all([
          ArtistsAPI.getArtists({ status: 'active', limit: 1000 }),
          SchoolsAPI.getSchools({ status: 'active', limit: 1000 }),
          getAuctions({
            brand_id: getBrandId(brand) || getBrandId('MSABER'),
            limit: 1000,
            sort_field: 'created_at',
            sort_direction: 'desc'
          }),
          fetchClients({
            status: 'active',
            limit: 1000,
            brand_code: 'ALL' // Show clients from all brands
          }),
          getConsignments({
            limit: 1000
          }).catch(error => { 
            console.error('Error fetching consignments in ItemForm:', error)
            return { success: false, data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 }, counts: { active: 0, pending: 0, completed: 0, cancelled: 0, archived: 0 } }
          }),
          GalleriesAPI.getGalleries({
            status: 'active',
            limit: 1000
          }),
          getBrands(),
          UsersAPI.getUsers({ brand_id: getBrandId(brand) || getBrandId('MSABER') })
        ])

        if (artistsResponse.success) {
          setArtists(artistsResponse.data)
        }
        if (schoolsResponse.success) {
          setSchools(schoolsResponse.data)
        }
        if (auctionsResponse.auctions) {
          setAuctions(auctionsResponse.auctions)
        }
        if (clientsResponse.success) {
          setClients(clientsResponse.data)
        }
        // Handle both possible response structures (same as consignments page)
        console.log('ItemForm - Consignments response:', consignmentsResponse) // Debug log
        const consignmentsData = consignmentsResponse.data || (consignmentsResponse as any).consignments || []
        console.log('ItemForm - Consignments data:', consignmentsData) // Debug log
        setConsignments(consignmentsData)
        if (galleriesResponse.success) {
          setGalleries(galleriesResponse.data)
        }
        if (brandsResponse.success) {
          setBrands(brandsResponse.data)
        }
        if (usersResponse.success) {
          setUsers(usersResponse.data)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingArtistsSchools(false)
        setLoadingAuctions(false)
        setLoadingClients(false)
        setLoadingConsignments(false)
        setLoadingGalleries(false)
        setLoadingBrands(false)
        setLoadingUsers(false)
      }
    }

    loadAllData()
  }, [brand])



  // Debug effect to track artist selection and client loading
  useEffect(() => {
    console.log('Debug - Artists loaded:', artists.length, artists.map(a => ({ id: a.id, name: a.name })))
    console.log('Debug - Current artist_id:', formData.artist_id)
    console.log('Debug - Artist options:', createArtistOptions())
    const currentArtist = artists.find(a => a.id?.toString() === formData.artist_id)
    console.log('Debug - Found current artist:', currentArtist)
  }, [artists, formData.artist_id])

  // Debug effect to track client loading
  useEffect(() => {
    console.log('Debug - Clients loaded:', clients.length, clients.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, type: c.client_type })))
    console.log('Debug - Consigner options:', createConsignerOptions())
    console.log('Debug - Loading clients:', loadingClients)
  }, [clients, loadingClients])

  // Helper function to generate auto title format
  // Format: ArtistFullName | (Birth-Death) | ArtworkSubject/Untitled | Medium (Materials) | Signature placement | Period
  const generateAutoTitle = (data?: FormData): string => {
    const currentData = data || formData
    const parts: string[] = []

    // 1. Artist name with birth-death years in parentheses
    if (currentData.artist_id) {
      const artist = artists.find(a => a.id?.toString() === currentData.artist_id)
      if (artist) {
        let artistPart = artist.name
        if (artist.birth_year || artist.death_year) {
          const birthYear = artist.birth_year || ''
          const deathYear = artist.death_year || ''
          artistPart += ` (${birthYear}${deathYear ? `-${deathYear}` : ''})`
        }
        parts.push(artistPart)
      }
    }

    // 2. Artwork subject or "Untitled"
    const artworkSubject = currentData.artwork_subject?.trim() || 'Untitled'
    parts.push(artworkSubject)

    // 3. Medium (Materials) - combine medium and materials if both exist
    let mediumPart = ''
    if (currentData.medium?.trim()) {
      mediumPart = currentData.medium.trim()
      // If materials is different from medium, add it in parentheses
      if (currentData.materials?.trim() && currentData.materials.trim() !== currentData.medium.trim()) {
        mediumPart += ` (${currentData.materials.trim()})`
      }
    } else if (currentData.materials?.trim()) {
      mediumPart = currentData.materials.trim()
    }
    if (mediumPart) {
      parts.push(mediumPart)
    }

    // 4. Signature placement (if signature exists)
    if (currentData.signature_placement?.trim()) {
      parts.push(`Signed ${currentData.signature_placement.trim()}`)
    }

    // 5. Period of the artwork
    if (currentData.period_age?.trim()) {
      parts.push(currentData.period_age.trim())
    }

    return parts.join(' | ')
  }

  // Helper function to generate preview description
  const previewDescription = useMemo(() => {
    const parts: string[] = []

    // Title (always first)
    const currentTitle = formData.title || generateAutoTitle() || 'Untitled Artwork'
    parts.push(currentTitle)

    // Artwork description (double line break after title)
    if (formData.description?.trim()) {
      parts.push(formData.description.trim())
    }

    // Artist info (if checkboxes are selected)
    if (formData.artist_id) {
      const artist = artists.find(a => a.id?.toString() === formData.artist_id)
      if (artist) {
        const artistParts: string[] = []

        if (formData.include_artist_description && artist.description) {
          artistParts.push(artist.description)
        }

        if (formData.include_artist_key_description && artist.key_description) {
          artistParts.push(artist.key_description)
        }

        if (formData.include_artist_biography && artist.biography) {
          artistParts.push(artist.biography)
        }

        if (formData.include_artist_notable_works && artist.notable_works) {
          artistParts.push(`Notable Works: ${artist.notable_works}`)
        }

        if (formData.include_artist_major_exhibitions && artist.exhibitions) {
          artistParts.push(`Major Exhibitions: ${artist.exhibitions}`)
        }

        if (formData.include_artist_awards_honors && artist.awards) {
          artistParts.push(`Awards and Honors: ${artist.awards}`)
        }

        if (formData.include_artist_market_value_range && artist.market_value_range) {
          artistParts.push(`Market Value Range: ${artist.market_value_range}`)
        }

        if (formData.include_artist_signature_style && artist.signature_style) {
          artistParts.push(`Signature Style: ${artist.signature_style}`)
        }

        if (artistParts.length > 0) {
          // Join artist parts with line breaks for better readability
          parts.push(artistParts.join('<br>'))
        }
      }
    }

    // Dimensions (single line break before dimensions)
    if (formData.height_inches || formData.width_inches || formData.height_cm || formData.width_cm) {
      let dimensionText = 'Dimensions: '
      if (formData.height_inches && formData.width_inches) {
        dimensionText += `${formData.height_inches} × ${formData.width_inches} inches`
        if (formData.height_cm && formData.width_cm) {
          dimensionText += ` (${formData.height_cm} × ${formData.width_cm} cm)`
        }
      } else if (formData.height_cm && formData.width_cm) {
        dimensionText += `${formData.height_cm} × ${formData.width_cm} cm`
      }
      parts.push(dimensionText)
    }

    // Join parts with specific formatting:
    // Title + Description + Artist Info use double line breaks
    // Artist Info + Dimensions use single line break
    if (parts.length > 2) {
      // We have title, description, and potentially artist info and dimensions
      const result = [
        parts[0], // title
        parts[1], // description
        ...parts.slice(2, -1), // artist info parts
        parts[parts.length - 1] // dimensions (if exists)
      ].join('<br><br>')

      // Replace the last double break with single break for dimensions
      return result.replace(/<br><br>Dimensions:/, '<br>Dimensions:')
    } else if (parts.length === 2) {
      // Just title and description, or title and artist info
      return parts.join('<br><br>')
    } else {
      // Just title or empty
      return parts[0] || 'Untitled Artwork'
    }
  }, [
    formData.title,
    formData.description,
    formData.artist_id,
    formData.include_artist_description,
    formData.include_artist_key_description,
    formData.include_artist_biography,
    formData.include_artist_notable_works,
    formData.include_artist_major_exhibitions,
    formData.include_artist_awards_honors,
    formData.include_artist_market_value_range,
    formData.include_artist_signature_style,
    formData.height_inches,
    formData.width_inches,
    formData.height_cm,
    formData.width_cm,
    artists
  ])

  // Helper function to create artist options for SearchableSelect
  const createArtistOptions = (): SearchableOption[] => {
    return artists
      .filter(artist => artist.id) // Ensure id exists
      .map(artist => ({
        value: artist.id!.toString(), // Ensure consistent string type
        label: artist.name,
        description: artist.birth_year && artist.death_year
          ? `${artist.birth_year} - ${artist.death_year}`
          : artist.birth_year
            ? `Born ${artist.birth_year}`
            : artist.nationality || ''
      }))
  }

  // Helper function to create school options for SearchableSelect  
  const createSchoolOptions = (): SearchableOption[] => {
    return schools
      .filter(school => school.id) // Ensure id exists
      .map(school => ({
        value: school.id!.toString(), // Ensure consistent string type
        label: school.name,
        description: school.location || ''
      }))
  }

  // Helper function to create client options for SearchableSelect
  const createClientOptions = (): SearchableOption[] => {
    return clients
      .filter(client => client.id) // Ensure id exists
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - ${client.client_type || 'buyer'}`
      }))
  }

  // Helper function to create consigner client options (vendors only)
  const createConsignerOptions = (): SearchableOption[] => {
    return clients
      .filter(client =>
        client.id &&
        (client.client_type === 'buyer' || client.client_type === 'vendor' || client.client_type === 'buyer_vendor')
      )
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - Vendor`
      }))
  }

  // Helper function to create vendor client options (vendors only)
  const createVendorOptions = (): SearchableOption[] => {
    return clients
      .filter(client =>
        client.id &&
        (client.client_type === 'vendor' || client.client_type === 'buyer' || client.client_type === 'buyer_vendor')
      )
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - Vendor`
      }))
  }

  const createBuyerOptions = (): SearchableOption[] => {
    return clients
      .filter(client =>
        client.id &&
        (client.client_type === 'buyer' || client.client_type === 'buyer_vendor')
      )
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - Buyer`
      }))
  }

  // Helper function to create consignment options for SearchableSelect
  const createConsignmentOptions = (): SearchableOption[] => {
    return consignments
      .filter(consignment => consignment.id) // Ensure id exists
      .map(consignment => {
        // Extract client name from nested clients object (same logic as consignments page)
        let clientName = 'Unknown Client'
        if ((consignment as any).clients) {
          const client = (consignment as any).clients
          const firstName = client.first_name || ''
          const lastName = client.last_name || ''
          const companyName = client.company_name || ''

          if (companyName) {
            clientName = companyName
          } else if (firstName || lastName) {
            clientName = [firstName, lastName].filter(Boolean).join(' ')
          }
        } else {
          // Fallback to flattened properties from backend response
          clientName = (consignment as any).client_name
            || [(consignment as any).client_first_name, (consignment as any).client_last_name].filter(Boolean).join(' ')
            || (consignment as any).client_company
            || 'Unknown Client'
        }

        return {
          value: consignment.id!.toString(),
          label: `Consignment ${consignment.id}`,
          description: `Client: ${clientName} - ${consignment.status || 'No status'} - ${consignment.items_count || 0} items`
        }
      })
  }

  // Helper function to create brand options for SearchableSelect
  const createBrandOptions = (): SearchableOption[] => {
    return brands
      .filter(brand => brand.id) // Ensure id exists
      .map(brand => ({
        value: brand.id!.toString(),
        label: brand.name,
        description: `${brand.code} - ${brand.contact_email || 'No email'}`
      }))
  }

  // Load item data if editing or handle AI data
  useEffect(() => {
    if (mode === 'edit' && itemId) {
      loadItemData()
    } else if (initialData) {
      populateFormData(initialData)
    } else if (mode === 'create') {
      // Check for AI data in URL parameters
      const aiDataParam = searchParams.get('ai_data')
      if (aiDataParam) {
        try {
          const aiData = JSON.parse(decodeURIComponent(aiDataParam))
          populateAIData(aiData)
        } catch (error) {
          console.error('Failed to parse AI data:', error)
        }
      }
    }
  }, [itemId, mode, initialData, searchParams])

  const loadItemData = async () => {
    if (!itemId) return

    try {
      setLoading(true)
      const response = await ArtworksAPI.getArtwork(itemId)
      if (response.success) {
        populateFormData(response.data)
      } else {
        setError('Failed to load item data')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item data')
    } finally {
      setLoading(false)
    }
  }



  const populateFormData = (data: Partial<Artwork>) => {
    // Auto-generate start_price and reserve if low_est exists but they're missing
    let startPrice = data.start_price?.toString() || ''
    let reservePrice = data.reserve?.toString() || ''

    if (data.low_est && !data.start_price) {
      const lowEst = data.low_est
      startPrice = generateStartPrice(lowEst).toString()
    }

    if ((data.low_est || data.start_price) && !data.reserve) {
      if (data.start_price) {
        reservePrice = data.start_price.toString()
      } else if (data.low_est) {
        const startPriceNum = generateStartPrice(data.low_est)
        reservePrice = startPriceNum.toString()
      }
    }

    setFormData({
      title: data.title || '',
      description: data.description || '',
      low_est: data.low_est?.toString() || '',
      high_est: data.high_est?.toString() || '',
      start_price: startPrice,
      condition: data.condition || '',
      reserve: reservePrice,
      vendor_id: (data as any).vendor_id?.toString() || '',
      buyer_id: (data as any).buyer_id?.toString() || '',
      consignment_id: data.consignment_id?.toString() || '',
      status: data.status || 'draft',
      category: data.category || '',
      subcategory: data.subcategory || '',
      height_inches: data.height_inches || '',
      width_inches: data.width_inches || '',
      height_cm: data.height_cm || '',
      width_cm: data.width_cm || '',
      height_with_frame_inches: data.height_with_frame_inches || '',
      width_with_frame_inches: data.width_with_frame_inches || '',
      height_with_frame_cm: data.height_with_frame_cm || '',
      width_with_frame_cm: data.width_with_frame_cm || '',
      weight: data.weight || '',
      materials: data.materials || '',
      artist_id: data.artist_id?.toString() || '',
      school_id: data.school_id || '',
      period_age: data.period_age || '',
      provenance: data.provenance || '',
      artwork_subject: (data as any).artwork_subject || '',
      signature_placement: (data as any).signature_placement || '',
      medium: (data as any).medium || '',
      include_artist_description: (data as any).include_artist_description !== undefined ? Boolean((data as any).include_artist_description) : true,
      include_artist_key_description: (data as any).include_artist_key_description !== undefined ? Boolean((data as any).include_artist_key_description) : true,
      include_artist_biography: Boolean((data as any).include_artist_biography) || false,
      include_artist_notable_works: Boolean((data as any).include_artist_notable_works) || false,
      include_artist_major_exhibitions: Boolean((data as any).include_artist_major_exhibitions) || false,
      include_artist_awards_honors: Boolean((data as any).include_artist_awards_honors) || false,
      include_artist_market_value_range: Boolean((data as any).include_artist_market_value_range) || false,
      include_artist_signature_style: Boolean((data as any).include_artist_signature_style) || false,
      condition_report: (data as any).condition_report || '',
      gallery_certification: (data as any).gallery_certification || false,
      gallery_certification_file: (data as any).gallery_certification_file || '',
      gallery_id: (data as any).gallery_id || '',
      artist_certification: (data as any).artist_certification || false,
      artist_certification_file: (data as any).artist_certification_file || '',
      certified_artist_id: (data as any).certified_artist_id || '',
      artist_family_certification: (data as any).artist_family_certification || false,
      artist_family_certification_file: (data as any).artist_family_certification_file || '',
      restoration_done: (data as any).restoration_done || false,
      restoration_done_file: (data as any).restoration_done_file || '',
      restoration_by: (data as any).restoration_by || '',
      brand_id: (data as any).brand_id?.toString() || '',
      return_date: data.return_date || '',
      return_location: data.return_location || '',
      return_reason: data.return_reason || '',
      returned_by_user_id: data.returned_by_user_id || '',
      returned_by_user_name: data.returned_by_user_name || '',
      images: data.images || []
    })
  }

  const populateAIData = (aiData: any) => {
    // Calculate start price and reserve price (reserve = start price for AI data)
    const startPrice = aiData.low_est ? generateStartPrice(aiData.low_est) : 0
    const reservePrice = startPrice ? generateReservePriceForAI(startPrice).toString() : ''

    setFormData({
      title: aiData.title || '',
      description: aiData.description || '',
      low_est: aiData.low_est?.toString() || '',
      high_est: aiData.high_est?.toString() || '',
      start_price: startPrice.toString(), // Auto-calculated from low_est
      condition: aiData.condition || '',
      reserve: reservePrice, // Set reserve price equal to start price
      vendor_id: '',
      buyer_id: '',
      consignment_id: '',
      status: 'draft',
      category: aiData.category || '',
      subcategory: '',
      height_inches: aiData.height_inches || '',
      width_inches: aiData.width_inches || '',
      height_cm: aiData.height_cm || '',
      width_cm: aiData.width_cm || '',
      height_with_frame_inches: aiData.height_with_frame_inches || '',
      width_with_frame_inches: aiData.width_with_frame_inches || '',
      height_with_frame_cm: aiData.height_with_frame_cm || '',
      width_with_frame_cm: aiData.width_with_frame_cm || '',
      weight: aiData.weight || '',
      materials: aiData.materials || '',
      artist_id: aiData.artist_id || '',
      school_id: '',
      period_age: aiData.period_age || '',
      provenance: '',
      artwork_subject: aiData.artwork_subject || '',
      signature_placement: aiData.signature_placement || '',
      medium: aiData.materials || '', // Use materials as medium initially
      include_artist_description: true,
include_artist_key_description: true,
include_artist_biography: false,
include_artist_notable_works: false,
include_artist_major_exhibitions: false,
include_artist_awards_honors: false,
include_artist_market_value_range: false,
include_artist_signature_style: false,
      condition_report: aiData.condition_report || '',
      gallery_certification: aiData.gallery_certification || false,
      gallery_certification_file: aiData.gallery_certification_file || '',
      gallery_id: aiData.gallery_id || '',
      artist_certification: aiData.artist_certification || false,
      artist_certification_file: aiData.artist_certification_file || '',
      certified_artist_id: aiData.certified_artist_id || '',
      artist_family_certification: aiData.artist_family_certification || false,
      artist_family_certification_file: aiData.artist_family_certification_file || '',
      restoration_done: aiData.restoration_done || false,
      restoration_done_file: aiData.restoration_done_file || '',
      restoration_by: aiData.restoration_by || '',
      brand_id: aiData.brand_id || '',
      images: [],
      return_date: '',
      return_location: '',
      return_reason: '',
      returned_by_user_id: '',
      returned_by_user_name: ''
    })

    // Auto-calculate start price if low estimate is available
    if (aiData.low_est) {
      const startPrice = generateStartPrice(aiData.low_est)
      setFormData(prev => ({ ...prev, start_price: startPrice.toString() }))
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    // Update the form data first
    setFormData(prev => {
      const updatedData = { ...prev, [field as keyof FormData]: value }

      // Auto-calculate with-frame dimensions when main dimensions change
      if (field === 'height_inches' || field === 'width_inches') {
        const height = parseFloat(updatedData.height_inches)
        const width = parseFloat(updatedData.width_inches)

        if (!isNaN(height) && !isNaN(width)) {
          updatedData.height_with_frame_inches = (height + 2).toFixed(1)
          updatedData.width_with_frame_inches = (width + 2).toFixed(1)
          updatedData.height_with_frame_cm = (parseFloat(updatedData.height_with_frame_inches) * 2.54).toFixed(1)
          updatedData.width_with_frame_cm = (parseFloat(updatedData.width_with_frame_inches) * 2.54).toFixed(1)
        }
      }

      // Auto-calculate with-frame dimensions when cm dimensions change
      if (field === 'height_cm' || field === 'width_cm') {
        const heightCm = parseFloat(updatedData.height_cm)
        const widthCm = parseFloat(updatedData.width_cm)

        if (!isNaN(heightCm) && !isNaN(widthCm)) {
          // Convert to inches, add 2 inches, convert back to cm
          const heightInInches = heightCm / 2.54
          const widthInInches = widthCm / 2.54
          updatedData.height_with_frame_inches = (heightInInches + 2).toFixed(1)
          updatedData.width_with_frame_inches = (widthInInches + 2).toFixed(1)
          updatedData.height_with_frame_cm = ((heightInInches + 2) * 2.54).toFixed(1)
          updatedData.width_with_frame_cm = ((widthInInches + 2) * 2.54).toFixed(1)
        }
      }

      return updatedData
    })

    // Auto-calculate start price when low_est changes
    if (field === 'low_est' && typeof value === 'string' && value) {
      const lowEst = parseFloat(value)
      if (!isNaN(lowEst)) {
        const startPrice = generateStartPrice(lowEst)
        const reservePrice = startPrice // Reserve = start price
        setFormData(prev => ({
          ...prev,
          start_price: startPrice.toString(),
          reserve: reservePrice.toString()
        }))
      }
    }

    // Auto-calculate reserve price when start_price changes
    if (field === 'start_price' && typeof value === 'string' && value) {
      const startPrice = parseFloat(value)
      if (!isNaN(startPrice)) {
        const reservePrice = startPrice // Reserve = start price
        setFormData(prev => ({ ...prev, reserve: reservePrice.toString() }))
      }
    }

    // Auto-generate title when related fields change
    if (['artist_id', 'artwork_subject', 'medium', 'signature_placement', 'period_age'].includes(field)) {
      // Use setTimeout to ensure the state update is processed first
      setTimeout(() => {
        setFormData(prev => {
          // Create the updated data with the new value
          const updatedData = { ...prev, [field as keyof FormData]: value }

          // Use the centralized title generation function
          const autoTitle = generateAutoTitle(updatedData)

          // Update title if we have meaningful content
          if (autoTitle && autoTitle !== 'Untitled') {
            return { ...updatedData, title: autoTitle }
          }

          return updatedData
        })
      }, 50) // Reduced delay for faster UI updates
    }

    // Clear validation errors when user starts typing
    setValidationErrors([])
  }
  const handleAIFill = (data: Record<string, any>, images: { file: File; preview: string }[]) => {
  // Apply AI data to form fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (['low_est', 'high_est', 'start_price', 'reserve'].includes(key)) {
        handleInputChange(key, value.toString())
      } else if (typeof value === 'boolean') {
        handleInputChange(key, value)
      } else {
        handleInputChange(key, String(value))
      }
    }
  })

  // Handle images from modal
  images.forEach(({ preview, file }, index) => {
    handleImageChange(index, preview, file)
  })

  setAiFilled(true)
  setShowAIModal(false)
  toast.success('Form auto-filled with AI data. Please review and adjust.')
}

  const handleImageChange = (index: number, url: string, file?: File) => {
    console.log('handleImageChange', index, url, file)
    setFormData(prev => {
      const newImages = [...prev.images]
      // Ensure array has enough slots
      while (newImages.length <= index) {
        newImages.push('')
      }
      newImages[index] = url
      return { ...prev, images: newImages }
    })

    if (file) {
      setPendingImages(prev => ({ ...prev, [`image_${index}`]: file }))
    } else {
      // Remove from pending if it's just a URL
      setPendingImages(prev => {
        const updated = { ...prev }
        delete updated[`image_${index}`]
        return updated
      })
    }

    // Clear validation errors
    setValidationErrors([])
  }

  const handleMultipleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    // Find next available slots in the images array
    const getNextAvailableSlots = (): number[] => {
      const availableSlots: number[] = []
      for (let i = 0; i < 10; i++) { // Allow up to 10 images for now (can be increased)
        if (!formData.images[i] || formData.images[i] === '') {
          availableSlots.push(i)
        }
      }
      return availableSlots
    }

    const availableSlots = getNextAvailableSlots()
    const filesToProcess = Array.from(files).slice(0, availableSlots.length)

    if (filesToProcess.length === 0) {
      toast.warning('All image slots are already filled. Please remove some images first.')
      return
    }

    if (filesToProcess.length < files.length) {
      toast.warning(`Only ${filesToProcess.length} files can be added (remaining slots available)`)
    }

    filesToProcess.forEach((file, index) => {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`)
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} is too large (max 10MB)`)
        return
      }

      // Use next available slot
      const slotIndex = availableSlots[index]

      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(file)

      // Update form data and pending images
      handleImageChange(slotIndex, blobUrl, file)
    })

    // Clear the input
    event.target.value = ''

    // Clear validation errors
    setValidationErrors([])
  }

  const handleCertificationFileUpload = (certificationType: 'gallery_certification_file' | 'artist_certification_file' | 'artist_family_certification_file' | 'restoration_done_file', file: File) => {
    // Create preview URL for the file
    const previewUrl = URL.createObjectURL(file)
    
    // Update form data with preview URL
    setFormData(prev => ({
      ...prev,
      [certificationType]: previewUrl
    }))
    
    // Store pending file
    setPendingCertificationFiles(prev => ({
      ...prev,
      [certificationType]: file
    }))
  }

  // AI generation function for edit mode
  const handleAIGeneration = async () => {
    // Check if there's a first image to analyze
    const firstImage = formData.images[0]
    if (!firstImage || firstImage.trim() === '') {
      setAIError('No image available for AI analysis. Please add an image first.')
      return
    }

    try {
      setAILoading(true)
      setAIError(null)
      setShowAISuggestions(true)

      console.log('Analyzing image with AI:', firstImage)
      const response = await ArtworksAPI.aiAnalyzeUrl(firstImage)

      if (response.success && response.result) {
        setAISuggestions(response.result)
      } else {
        setAIError(response.error || 'Failed to analyze image')
      }
    } catch (error: any) {
      setAIError(error.message || 'Failed to analyze image')
      console.error('AI analysis error:', error)
    } finally {
      setAILoading(false)
    }
  }

  // Apply AI suggestions to form
  const handleApplyAISuggestions = (selectedFields: any) => {
    Object.entries(selectedFields).forEach(([fieldName, value]) => {
      if (value !== undefined && value !== null) {
        // Convert numeric fields to strings for form compatibility
        if (['low_est', 'high_est', 'start_price', 'reserve'].includes(fieldName)) {
          handleInputChange(fieldName, value.toString())
        } else if (typeof value === 'boolean') {
          handleInputChange(fieldName, value)
        } else {
          handleInputChange(fieldName, String(value))
        }
      }
    })

    console.log('Applied AI suggestions:', selectedFields)
    toast.success(`Applied ${Object.keys(selectedFields).length} AI suggestions to the form.`)
  }

  // Get count of filled image slots
  const getFilledSlotsCount = (): number => {
    return formData.images.filter(url => url && url.trim() !== '').length
  }


  const uploadPendingImages = async (tempItemId: string): Promise<string[]> => {
    const uploadedImageUrls: string[] = []

    if (Object.keys(pendingImages).length === 0) {
      return uploadedImageUrls
    }

    try {
      console.log('Uploading pending images for item:', tempItemId)

      // Upload each image individually to get proper URLs
      for (const [fieldName, file] of Object.entries(pendingImages)) {
        const imageIndex = parseInt(fieldName.replace('image_', ''))

        const formData = new FormData()
        formData.append('image', file)
        formData.append('itemId', tempItemId)
        formData.append('imageIndex', imageIndex.toString())

        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error(`Failed to upload image ${imageIndex}:`, errorData)
          continue // Continue with other images
        }

        const result = await response.json()
        console.log(`Successfully uploaded image ${imageIndex}:`, result.url)

        // Store the URL at the correct index
        uploadedImageUrls[imageIndex] = result.url
      }

      return uploadedImageUrls
    } catch (error: any) {
      console.error('Image upload error:', error)
      throw new Error(`Image upload failed: ${error.message || 'Unknown error'}`)
    }
  }

  const uploadPendingCertificationFiles = async (tempItemId: string): Promise<Record<string, string>> => {
    const uploadedFiles: Record<string, string> = {}

    if (Object.keys(pendingCertificationFiles).length === 0) {
      return uploadedFiles
    }

    try {
      for (const [fieldKey, file] of Object.entries(pendingCertificationFiles)) {
        console.log(`Uploading certification file for ${fieldKey}...`)
        
        // Create a unique filename
        const fileExtension = file.name.split('.').pop() || 'pdf'
        const fileName = `certification_${tempItemId}_${fieldKey}_${Date.now()}.${fileExtension}`
        
        // Upload to Supabase Storage
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from('items')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`Error uploading ${fieldKey}:`, error)
          throw new Error(`Failed to upload ${fieldKey}: ${error.message}`)
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('items')
          .getPublicUrl(fileName)

        uploadedFiles[fieldKey] = publicUrlData.publicUrl
        console.log(`Successfully uploaded ${fieldKey}: ${publicUrlData.publicUrl}`)
      }

      // Clear the pending files
      setPendingCertificationFiles({})
      
      return uploadedFiles
    } catch (error) {
      console.error('Error uploading certification files:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Convert form data to Artwork format
    const artworkData: Partial<Artwork> = {
      title: formData.title,
      description: formData.description,
      low_est: parseFloat(formData.low_est),
      high_est: parseFloat(formData.high_est),
      start_price: formData.start_price ? parseFloat(formData.start_price) : undefined,
      condition: formData.condition || undefined,
      reserve: formData.reserve ? parseFloat(formData.reserve) : undefined,
      vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : undefined,
      buyer_id: formData.buyer_id ? parseInt(formData.buyer_id) : undefined,
      status: formData.status,
      category: formData.category || undefined,
      subcategory: formData.subcategory || undefined,
      height_inches: formData.height_inches || undefined,
      width_inches: formData.width_inches || undefined,
      height_cm: formData.height_cm || undefined,
      width_cm: formData.width_cm || undefined,
      height_with_frame_inches: formData.height_with_frame_inches || undefined,
      width_with_frame_inches: formData.width_with_frame_inches || undefined,
      height_with_frame_cm: formData.height_with_frame_cm || undefined,
      width_with_frame_cm: formData.width_with_frame_cm || undefined,
      weight: formData.weight || undefined,
      materials: formData.materials || undefined,
      artist_id: formData.artist_id ? parseInt(formData.artist_id) : undefined,
      school_id: formData.school_id || undefined,
      period_age: formData.period_age || undefined,
      provenance: formData.provenance || undefined,
      consignment_id: formData.consignment_id ? parseInt(formData.consignment_id) : undefined,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : undefined,
      images: formData.images.filter(url => url && url.trim() !== '') // Filter out empty strings
    }

    // Validate the data
    const errors = validateArtworkData(artworkData)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Handle file uploads if there are pending files
      if (Object.keys(pendingImages).length > 0 || Object.keys(pendingCertificationFiles).length > 0) {
        const tempItemId = itemId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        try {
          // Upload pending images and get the URLs
          const uploadedImageUrls = await uploadPendingImages(tempItemId)

          // Update the images array with uploaded URLs, replacing blob URLs
          const updatedImages = [...formData.images]
          uploadedImageUrls.forEach((url, index) => {
            if (url) {
              updatedImages[index] = url
            }
          })

          // Update artwork data with the corrected images array
          artworkData.images = updatedImages.filter(url => url && url.trim() !== '')

          // Upload certification files
          const uploadedCertificationFileUrls = await uploadPendingCertificationFiles(tempItemId)

          // Update artwork data with uploaded certification file URLs
          Object.entries(uploadedCertificationFileUrls).forEach(([fieldName, url]) => {
            (artworkData as any)[fieldName] = url
          })

          // Clear pending images and certification files
          setPendingImages({})
          setPendingCertificationFiles({})

          // Clean up blob URLs
          Object.entries(pendingImages).forEach(([key, file]) => {
            const index = parseInt(key.replace('image_', ''))
            if (!isNaN(index) && formData.images[index] && formData.images[index].startsWith('blob:')) {
              URL.revokeObjectURL(formData.images[index])
            }
          })

        } catch (uploadError: any) {
          setError(`Image upload failed: ${uploadError.message}`)
          return
        }
      }

      let savedArtwork
      if (mode === 'create') {
        const result = await ArtworksAPI.createArtwork(artworkData as Omit<Artwork, 'id' | 'created_at' | 'updated_at'>, brand)
        savedArtwork = result.data
      } else if (itemId) {
        const result = await ArtworksAPI.updateArtwork(itemId, artworkData, brand)
        savedArtwork = result.data
      }

      if (onSave && savedArtwork) {
        onSave(savedArtwork)
      } else {
        // Build the return URL with ALL preserved pagination, sorting, and filter parameters
        const params = new URLSearchParams()

        // Add pagination parameters if they exist in the current URL
        const page = searchParams.get('page')
        const limit = searchParams.get('limit')
        const sortField = searchParams.get('sort_field')
        const sortDirection = searchParams.get('sort_direction')

        if (page) params.set('page', page)
        if (limit) params.set('limit', limit)
        if (sortField) params.set('sort_field', sortField)
        if (sortDirection) params.set('sort_direction', sortDirection)

        // Add ALL filter parameters from ItemsFilter.tsx
        const filterKeys = [
          'status', 'category', 'search', 'brand', 'item_id',
          'low_est_min', 'low_est_max', 'high_est_min', 'high_est_max',
          'start_price_min', 'start_price_max', 'condition', 'period_age',
          'materials', 'artist_id', 'school_id', 'buyer_id', 'vendor_id'
        ]
        filterKeys.forEach(key => {
          const value = searchParams.get(key)
          if (value && value !== '' && value !== 'all') {
            params.set(key, value)
          }
        })

        const queryString = params.toString()
        const returnUrl = `/items${queryString ? `?${queryString}` : ''}`

        router.push(returnUrl)
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} item`)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'details', label: 'Details', icon: '🔍' },
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'preview', label: 'Preview', icon: '👁️' }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              // Build the return URL with ALL preserved pagination, sorting, and filter parameters
              const params = new URLSearchParams()

              // Add pagination parameters if they exist in the current URL
              const page = searchParams.get('page')
              const limit = searchParams.get('limit')
              const sortField = searchParams.get('sort_field')
              const sortDirection = searchParams.get('sort_direction')

              if (page) params.set('page', page)
              if (limit) params.set('limit', limit)
              if (sortField) params.set('sort_field', sortField)
              if (sortDirection) params.set('sort_direction', sortDirection)

              // Add ALL filter parameters from ItemsFilter.tsx
              const filterKeys = [
                'status', 'category', 'search', 'brand', 'item_id',
                'low_est_min', 'low_est_max', 'high_est_min', 'high_est_max',
                'start_price_min', 'start_price_max', 'condition', 'period_age',
                'materials', 'artist_id', 'school_id', 'buyer_id', 'vendor_id'
              ]
              filterKeys.forEach(key => {
                const value = searchParams.get(key)
                if (value && value !== '' && value !== 'all') {
                  params.set(key, value)
                }
              })

              const queryString = params.toString()
              const returnUrl = `/items${queryString ? `?${queryString}` : ''}`

              router.push(returnUrl)
            }}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Inventory
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Add Inventory' : 'Edit Inventory'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
  {/* AI Auto-Fill - Create mode only */}
  {mode === 'create' && (
    <button
      type="button"
      onClick={() => setShowAIModal(true)}
      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm hover:shadow-md"
    >
      <Sparkles className="h-4 w-4 mr-2" />
      AI Auto-Fill
      {aiFilled && <span className="ml-1.5 w-2 h-2 rounded-full bg-green-400 inline-block" />}
    </button>
  )}

  {/* AI Generate - Edit mode only (your existing code) */}
  {mode === 'edit' && formData.images[0] && formData.images[0].trim() !== '' && (
    <button
      type="button"
      onClick={handleAIGeneration}
      disabled={aiLoading}
      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
    >
      <Sparkles className="h-4 w-4 mr-2" />
      {aiLoading ? 'Analyzing...' : 'AI Generate'}
    </button>
  )}
          
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel()
              } else {
                // Build the return URL with ALL preserved pagination, sorting, and filter parameters
                const params = new URLSearchParams()

                // Add pagination parameters if they exist in the current URL
                const page = searchParams.get('page')
                const limit = searchParams.get('limit')
                const sortField = searchParams.get('sort_field')
                const sortDirection = searchParams.get('sort_direction')

                if (page) params.set('page', page)
                if (limit) params.set('limit', limit)
                if (sortField) params.set('sort_field', sortField)
                if (sortDirection) params.set('sort_direction', sortDirection)

                // Add ALL filter parameters from ItemsFilter.tsx
                const filterKeys = [
                  'status', 'category', 'search', 'brand', 'item_id',
                  'low_est_min', 'low_est_max', 'high_est_min', 'high_est_max',
                  'start_price_min', 'start_price_max', 'condition', 'period_age',
                  'materials', 'artist_id', 'school_id', 'buyer_id', 'vendor_id'
                ]
                filterKeys.forEach(key => {
                  const value = searchParams.get(key)
                  if (value && value !== '' && value !== 'all') {
                    params.set(key, value)
                  }
                })

                const queryString = params.toString()
                const returnUrl = `/items${queryString ? `?${queryString}` : ''}`

                router.push(returnUrl)
              }
            }}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
          <ul className="list-disc list-inside text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form id="item-form" onSubmit={handleSubmit} className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* AI Filled Success Message */}
    {aiFilled && (
      <div className="flex items-center space-x-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" />
        <p className="text-sm text-purple-700">Fields were auto-filled by AI. Please review and adjust as needed.</p>
        <button 
          type="button" 
          onClick={() => setAiFilled(false)} 
          className="ml-auto text-purple-400 hover:text-purple-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )}
              {/* Client & Consignment Selection Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-4">Client & Consignment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <SearchableSelect
                      value={formData.brand_id}
                      options={brands.length > 0 ? createBrandOptions() : []}
                      placeholder={loadingBrands ? "Loading brands..." : "Select brand..."}
                      onChange={(value) => handleInputChange('brand_id', value?.toString() || '')}
                      disabled={loadingBrands || brands.length === 0}
                      inputPlaceholder="Search brands..."
                    />
                    {loadingBrands && (
                      <p className="text-xs text-gray-500 mt-1">Loading brands...</p>
                    )}
                    {!loadingBrands && createBrandOptions().length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">No brands found. Please create brands first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignment Number (Optional)
                    </label>
                    <SearchableSelect
                      value={formData.consignment_id}
                      options={createConsignmentOptions()}
                      placeholder={loadingConsignments ? "Loading consignments..." : "Select consignment..."}
                      onChange={(value) => {
                        const consignmentId = value?.toString() || ''
                        handleInputChange('consignment_id', consignmentId)

                        // Auto-fill consigner if consignment is selected
                        if (consignmentId) {
                          const selectedConsignment = consignments.find(c => c.id?.toString() === consignmentId)
                          if (selectedConsignment?.client_id) {
                            handleInputChange('vendor_id', selectedConsignment.client_id.toString())
                          }
                        }
                      }}
                      disabled={loadingConsignments}
                      inputPlaceholder="Search consignments..."
                    />
                    {loadingConsignments && (
                      <p className="text-xs text-gray-500 mt-1">Loading consignments...</p>
                    )}
                    {!loadingConsignments && createConsignmentOptions().length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">No consignments found. Create a consignment first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor (Consignor) *
                    </label>
                    <SearchableSelect
                      value={formData.vendor_id}
                      options={clients.length > 0 ? createVendorOptions() : []}
                      placeholder={loadingClients ? "Loading vendors..." : "Select vendor..."}
                      onChange={(value) => handleInputChange('vendor_id', value?.toString() || '')}
                      disabled={loadingClients}
                      inputPlaceholder="Search vendors..."
                    />
                    {formData.consignment_id && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Vendor auto-filled from selected consignment
                      </p>
                    )}
                  </div>

                  {formData.status === 'sold' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buyer *
                        <span className="text-xs text-gray-500"> (required if sold)</span>
                      </label>
                      <SearchableSelect
                        value={formData.buyer_id}
                        options={clients.length > 0 ? createBuyerOptions() : []}
                        placeholder={loadingClients ? "Loading buyers..." : "Select buyer..."}
                        onChange={(value) => handleInputChange('buyer_id', value?.toString() || '')}
                        disabled={loadingClients}
                        inputPlaceholder="Search buyers..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Artist/School Selection */}
              <ArtistSchoolSelection
                artistId={formData.artist_id}
                schoolId={formData.school_id}
                artworkSubject={formData.artwork_subject}
                signaturePlacement={formData.signature_placement}
                medium={formData.medium}
                periodAge={formData.period_age}
                artists={artists}
                schools={schools}
                loadingArtistsSchools={loadingArtistsSchools}
                materialOptions={materialOptions}
                periodOptions={periodOptions}
                onFieldChange={handleInputChange}
                uniqueIdPrefix="itemform_"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">




                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>


              </div>

              {/* Return Information - Only show when status is 'returned' */}
              {formData.status === 'returned' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-orange-900 mb-4">Return Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Return Date</label>
                      <input
                        type="date"
                        value={formData.return_date}
                        onChange={(e) => handleInputChange('return_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Returned By</label>
                      <SearchableSelect
                        value={formData.returned_by_user_id}
                        onChange={(value) => {
                          const selectedUser = users.find(u => u.id.toString() === String(value))
                          handleInputChange('returned_by_user_id', String(value))
                          handleInputChange('returned_by_user_name', selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : '')
                        }}
                        options={users.map((u) => ({ 
                          value: u.id.toString(), 
                          label: `${u.first_name} ${u.last_name} (${u.role})`, 
                          description: u.email 
                        }))}
                        placeholder="Select staff member"
                        onSearch={async (query) => {
                          const filteredUsers = users.filter(user =>
                            `${user.first_name} ${user.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
                            user.role.toLowerCase().includes(query.toLowerCase()) ||
                            user.email.toLowerCase().includes(query.toLowerCase())
                          );
                          return filteredUsers.map((user) => ({
                            value: user.id.toString(),
                            label: `${user.first_name} ${user.last_name} (${user.role})`,
                            description: user.email
                          }));
                        }}
                        enableDynamicSearch={true}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Return Location</label>
                      <input
                        type="text"
                        value={formData.return_location}
                        onChange={(e) => handleInputChange('return_location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., Storage Room A, Client Location, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason</label>
                      <input
                        type="text"
                        value={formData.return_reason}
                        onChange={(e) => handleInputChange('return_reason', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., Client request, Damage, Unsold, etc."
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title * <span className="text-xs text-gray-500">(max 200 chars for LiveAuctioneers)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/200 characters
                </div>
              </div>

              {/* Artwork Description Section */}
              <ArtworkDescriptionSection
                title={formData.title}
                description={formData.description}
                artistId={formData.artist_id}
                artists={artists}
                includeArtistDescription={formData.include_artist_description}
                includeArtistKeyDescription={formData.include_artist_key_description}
                includeArtistBiography={formData.include_artist_biography}
                includeArtistNotableWorks={formData.include_artist_notable_works}
                includeArtistMajorExhibitions={formData.include_artist_major_exhibitions}
                includeArtistAwardsHonors={formData.include_artist_awards_honors}
                includeArtistMarketValueRange={formData.include_artist_market_value_range}
                includeArtistSignatureStyle={formData.include_artist_signature_style}
                conditionReport={formData.condition_report}
                onFieldChange={handleInputChange}
                uniqueIdPrefix="itemform_"
              />



              {/* Certification Fields */}

              <CertificationSection
                galleryCertification={formData.gallery_certification}
                galleryCertificationFile={formData.gallery_certification_file}
                galleryId={formData.gallery_id}
                artistCertification={formData.artist_certification}
                artistCertificationFile={formData.artist_certification_file}
                certifiedArtistId={formData.certified_artist_id}
                artistFamilyCertification={formData.artist_family_certification}
                artistFamilyCertificationFile={formData.artist_family_certification_file}
                restorationDone={formData.restoration_done}
                restorationDoneFile={formData.restoration_done_file}
                restorationBy={formData.restoration_by}
                onFieldChange={handleInputChange}
                onCertificationFileUpload={handleCertificationFileUpload}
                uniqueIdPrefix="itemform_"
              />


            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Pricing Information Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-4">Pricing Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Estimate * (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.low_est}
                      onChange={(e) => handleInputChange('low_est', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      High Estimate * (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.high_est}
                      onChange={(e) => handleInputChange('high_est', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Price (£) <span className="text-xs text-gray-500">(auto-calculated)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.start_price}
                      onChange={(e) => handleInputChange('start_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reserve Price (£) <span className="text-xs text-gray-500">(internal use)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.reserve}
                      onChange={(e) => handleInputChange('reserve', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category Information Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-4">Category Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <SearchableSelect
                      value={formData.category}
                      options={[{ value: '', label: 'Select category...' }, ...categoryOptions]}
                      placeholder="Select category..."
                      onChange={(value) => handleInputChange('category', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search categories..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Oil Paintings, Watercolors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <SearchableSelect
                      value={formData.condition}
                      options={[{ value: '', label: 'Select condition...' }, ...conditionOptions]}
                      placeholder="Select condition..."
                      onChange={(value) => handleInputChange('condition', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search conditions..."
                    />
                  </div>
                </div>
              </div>


              {/* Dimensions Section */}
              <DimensionsSection
                heightInches={formData.height_inches}
                widthInches={formData.width_inches}
                heightCm={formData.height_cm}
                widthCm={formData.width_cm}
                heightWithFrameInches={formData.height_with_frame_inches}
                widthWithFrameInches={formData.width_with_frame_inches}
                heightWithFrameCm={formData.height_with_frame_cm}
                widthWithFrameCm={formData.width_with_frame_cm}
                weight={formData.weight}
                onFieldChange={handleInputChange}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provenance
                </label>
                <textarea
                  rows={3}
                  value={formData.provenance}
                  onChange={(e) => handleInputChange('provenance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="History and ownership details"
                />
              </div>


            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Upload up to 10 images for this item. Images will be stored securely and optimized for auction platforms.
              </div>

              {/* Multiple File Upload */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Bulk Upload</h4>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {getFilledSlotsCount()}/10 slots filled
                  </span>
                </div>
                <p className="text-sm text-blue-800 mb-3">
                  Select multiple files to automatically populate available image slots.
                </p>

                <div className="space-y-3">
                  {/* Initial Upload */}
                  <div>
                    <input
                      id="bulk-upload-input"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {/* Add More Button */}
                  {getFilledSlotsCount() > 0 && getFilledSlotsCount() < 10 && (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('bulk-upload-additional') as HTMLInputElement
                          if (input) input.click()
                        }}
                        className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 border border-blue-300 hover:border-blue-400 hover:shadow-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add More Images ({10 - getFilledSlotsCount()} slots available)
                      </button>
                      <input
                        id="bulk-upload-additional"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultipleImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs text-blue-600 mt-2">
                  Maximum 10 files total. Supported formats: JPG, PNG, GIF (max 10MB each)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 10 }, (_, i) => (
                  <ImageUploadField
                    key={i}
                    label={`Image ${i + 1}`}
                    value={formData.images[i] || ''}
                    onChange={(url, file) => handleImageChange(i, url, file)}
                    itemId={itemId}
                    imageIndex={i + 1}
                    required={i === 0} // First image is required
                    showEditButton={true}
                  />
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Image Requirements</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Supported formats: JPG, PNG, GIF</li>
                  <li>• Maximum file size: 10MB per image</li>
                  <li>• Recommended minimum resolution: 800x600 pixels</li>
                  <li>• First image will be used as the primary listing image</li>
                  <li>• Images are automatically stored in secure cloud storage</li>
                </ul>
              </div>
            </div>
          )}



          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Preview</h3>
                <p className="text-sm text-gray-600 mb-6">
                  This is how your artwork information will appear when exported to auction platforms.
                </p>



                {/* Description Preview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description Preview:</h4>
                  <div
                    className="bg-white border border-gray-200 rounded-md p-4"
                    key={`${formData.include_artist_description}-${formData.include_artist_key_description}-${formData.include_artist_biography}-${formData.include_artist_notable_works}-${formData.include_artist_major_exhibitions}-${formData.include_artist_awards_honors}-${formData.include_artist_market_value_range}-${formData.include_artist_signature_style}`}
                  >
                    <div
                      className="text-gray-900 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: previewDescription || 'Enter artwork description...'
                      }}
                    />
                  </div>
                </div>

                {/* Export Information */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Export Information:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Description includes selected artist information</li>
                    <li>• Dimensions will be formatted appropriately for each platform</li>
                    {formData.vendor_id && (
                      <li>• Vendor: {(() => {
                        const client = clients.find(c => c.id?.toString() === formData.vendor_id)
                        return client ? getClientDisplayName(client) : `ID: ${formData.vendor_id}`
                      })()}</li>
                    )}
                    {formData.buyer_id && formData.status === 'sold' && (
                      <li>• Buyer: {(() => {
                        const client = clients.find(c => c.id?.toString() === formData.buyer_id)
                        return client ? getClientDisplayName(client) : `ID: ${formData.buyer_id}`
                      })()}</li>
                    )}
                  </ul>
                </div>

                {/* Live Preview Updates */}
                <div className="mt-4 text-xs text-gray-500">
                  📝 Preview updates automatically as you edit fields in other tabs.
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        isOpen={showAISuggestions}
        onClose={() => {
          setShowAISuggestions(false)
          setAISuggestions(null)
          setAIError(null)
        }}
        suggestions={aiSuggestions}
        loading={aiLoading}
        error={aiError}
        onApplySuggestions={handleApplyAISuggestions}
      />
      {/* AI Auto-Fill Modal */}
{mode === 'create' && showAIModal && (
  <AIAutoFillModal 
    onClose={() => setShowAIModal(false)} 
    onFill={handleAIFill} 
  />
)}
    </div>
  )
} 