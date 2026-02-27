// frontend/src/app/inventory-form/page.tsx
"use client"

// Disable static generation for this page since it uses browser APIs
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, Save, X, Upload, Trash2, Plus } from 'lucide-react'
import { generateStartPrice, ITEM_CATEGORIES, ITEM_PERIODS, ITEM_MATERIALS, ITEM_CONDITIONS } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { SchoolsAPI, School } from '@/lib/schools-api'
import dynamicImport from 'next/dynamic'
import SearchableSelect, { SearchableOption } from '@/components/ui/SearchableSelect'
import { getApiBaseUrl } from '@/lib/google-sheets-api'
import ClientInfoSection from '@/components/items/common/ClientInfoSection'
import ArtistSchoolSelection from '@/components/items/common/ArtistSchoolSelection'
import ArtworkDescriptionSection from '@/components/items/common/ArtworkDescriptionSection'
import DimensionsSection from '@/components/items/common/DimensionsSection'
import CertificationSection from '@/components/items/common/CertificationSection'

// Dynamically import ImageUploadField to avoid SSR issues
const ImageUploadField = dynamicImport(() => import('@/components/items/ImageUploadField'), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Loading image upload...
      </label>
      <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    </div>
  )
})

interface ClientInfo {
  client_id?: string // For existing client ID option
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
}

interface ArtworkFormData {
  id: string // temporary ID for form management
  title: string
  description: string
  low_est: string
  high_est: string
  start_price: string
  condition: string
  reserve: string
  category: string
  subcategory: string
  weight: string
  materials: string
  artist_id: string
  school_id: string
  period_age: string
  provenance: string
  artwork_subject: string
  signature_placement: string
  medium: string
  include_artist_description: boolean
  include_artist_key_description: boolean
  include_artist_biography: boolean
  include_artist_notable_works: boolean
  include_artist_major_exhibitions: boolean
  include_artist_awards_honors: boolean
  include_artist_market_value_range: boolean
  include_artist_signature_style: boolean
  height_inches: string
  width_inches: string
  height_cm: string
  width_cm: string
  height_with_frame_inches: string
  width_with_frame_inches: string
  height_with_frame_cm: string
  width_with_frame_cm: string
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
  images: string[]
}

interface PublicItemInput {
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
  consignment_id: string

  // Additional auction management fields
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

  // Images array (unlimited images)
  images: string[]
}

const createInitialArtworkData = (): ArtworkFormData => ({
  title: '',
  description: '',
  low_est: '',
  high_est: '',
  start_price: '',
  condition: '',
  reserve: '',
  id: Math.random().toString(36).substr(2, 9),
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
  images: []
})


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

async function submitPendingItems(payload: any) {
  const apiUrl = getApiBaseUrl()
  const res = await fetch(`${apiUrl}/public/inventory/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Submission failed')
  return data
}

export default function InventoryFormPage() {
  const [clientId, setClientId] = useState('')
  const [clientInfo, setClientInfo] = useState<ClientInfo>({})
  const [artworks, setArtworks] = useState<ArtworkFormData[]>([createInitialArtworkData()])
  const [activeArtworkIndex, setActiveArtworkIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('client')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loadingArtistsSchools, setLoadingArtistsSchools] = useState(false)
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({})
  const [pendingCertificationFiles, setPendingCertificationFiles] = useState<Record<string, File>>({})

  // Get current artwork being edited
  const currentArtwork = artworks[activeArtworkIndex] || createInitialArtworkData()

  // Load artists and schools data
  useEffect(() => {
    const loadArtistsSchools = async () => {
      try {
        setLoadingArtistsSchools(true)
        const [artistsResponse, schoolsResponse] = await Promise.all([
          ArtistsAPI.getArtists({ status: 'active', limit: 1000 }),
          SchoolsAPI.getSchools({ status: 'active', limit: 1000 }),
        ])

        if (artistsResponse.success) {
          setArtists(artistsResponse.data)
        }
        if (schoolsResponse.success) {
          setSchools(schoolsResponse.data)
        }
      } catch (err) {
        console.error('Failed to load artists/schools:', err)
      } finally {
        setLoadingArtistsSchools(false)
      }
    }

    loadArtistsSchools()
  }, [])

  // Add new artwork
  const addArtwork = () => {
    const newArtwork = createInitialArtworkData()
    setArtworks(prev => [...prev, newArtwork])
    setActiveArtworkIndex(artworks.length)
  }

  // Remove artwork
  const removeArtwork = (index: number) => {
    if (artworks.length <= 1) return // Keep at least one artwork
    setArtworks(prev => prev.filter((_, i) => i !== index))
    if (activeArtworkIndex >= artworks.length - 1) {
      setActiveArtworkIndex(Math.max(0, artworks.length - 2))
    }
  }

  // Update current artwork
  const updateCurrentArtwork = (field: keyof ArtworkFormData, value: string | boolean) => {
    setArtworks(prev => prev.map((artwork, index) =>
      index === activeArtworkIndex ? { ...artwork, [field]: value } : artwork
    ))
  }

  // Helper function to generate auto title format
  const generateAutoTitle = (data?: ArtworkFormData): string => {
    const currentData = data || currentArtwork
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
    const currentTitle = currentArtwork.title || generateAutoTitle() || 'Untitled Artwork'
    parts.push(currentTitle)

    // Artwork description (double line break after title)
    if (currentArtwork.description?.trim()) {
      parts.push(currentArtwork.description.trim())
    }

    // Artist info (if checkboxes are selected)
    if (currentArtwork.artist_id) {
      const artist = artists.find(a => a.id?.toString() === currentArtwork.artist_id)
      if (artist) {
        const artistParts: string[] = []

        if (currentArtwork.include_artist_description && artist.description) {
          artistParts.push(artist.description)
        }

        if (currentArtwork.include_artist_key_description && artist.key_description) {
          artistParts.push(artist.key_description)
        }

        if (currentArtwork.include_artist_biography && artist.biography) {
          artistParts.push(artist.biography)
        }

        if (currentArtwork.include_artist_notable_works && artist.notable_works) {
          artistParts.push(`Notable Works: ${artist.notable_works}`)
        }

        if (currentArtwork.include_artist_major_exhibitions && artist.exhibitions) {
          artistParts.push(`Major Exhibitions: ${artist.exhibitions}`)
        }

        if (currentArtwork.include_artist_awards_honors && artist.awards) {
          artistParts.push(`Awards and Honors: ${artist.awards}`)
        }

        if (currentArtwork.include_artist_market_value_range && artist.market_value_range) {
          artistParts.push(`Market Value Range: ${artist.market_value_range}`)
        }

        if (currentArtwork.include_artist_signature_style && artist.signature_style) {
          artistParts.push(`Signature Style: ${artist.signature_style}`)
        }

        if (artistParts.length > 0) {
          // Join artist parts with line breaks for better readability
          parts.push(artistParts.join('<br>'))
        }
      }
    }

    // Dimensions (single line break before dimensions)
    if (currentArtwork.height_inches || currentArtwork.width_inches || currentArtwork.height_cm || currentArtwork.width_cm) {
      let dimensionText = 'Dimensions: '
      if (currentArtwork.height_inches && currentArtwork.width_inches) {
        dimensionText += `${currentArtwork.height_inches} × ${currentArtwork.width_inches} inches`
        if (currentArtwork.height_cm && currentArtwork.width_cm) {
          dimensionText += ` (${currentArtwork.height_cm} × ${currentArtwork.width_cm} cm)`
        }
      } else if (currentArtwork.height_cm && currentArtwork.width_cm) {
        dimensionText += `${currentArtwork.height_cm} × ${currentArtwork.width_cm} cm`
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
    currentArtwork.title,
    currentArtwork.description,
    currentArtwork.artist_id,
    currentArtwork.include_artist_description,
    currentArtwork.include_artist_key_description,
    currentArtwork.include_artist_biography,
    currentArtwork.include_artist_notable_works,
    currentArtwork.include_artist_major_exhibitions,
    currentArtwork.include_artist_awards_honors,
    currentArtwork.include_artist_market_value_range,
    currentArtwork.include_artist_signature_style,
    currentArtwork.height_inches,
    currentArtwork.width_inches,
    currentArtwork.height_cm,
    currentArtwork.width_cm,
    artists,
    activeArtworkIndex
  ])


  const handleInputChange = (field: string, value: string | boolean) => {
    // Update the current artwork data first
    const updatedArtwork = { ...currentArtwork, [field as keyof ArtworkFormData]: value }
    setArtworks(prev => prev.map((artwork, index) =>
      index === activeArtworkIndex ? updatedArtwork : artwork
    ))

    // Auto-calculations for the updated artwork
    const performAutoCalculations = (data: ArtworkFormData) => {

      // Auto-calculate with-frame dimensions when main dimensions change
      if (field === 'height_inches' || field === 'width_inches') {
        const height = parseFloat(data.height_inches)
        const width = parseFloat(data.width_inches)

        if (!isNaN(height) && !isNaN(width)) {
          (data as any).height_with_frame_inches = (height + 2).toFixed(1);
          (data as any).width_with_frame_inches = (width + 2).toFixed(1);
          (data as any).height_with_frame_cm = (parseFloat((data as any).height_with_frame_inches) * 2.54).toFixed(1);
          (data as any).width_with_frame_cm = (parseFloat((data as any).width_with_frame_inches) * 2.54).toFixed(1)
        }
      }

      // Auto-calculate with-frame dimensions when cm dimensions change
      if (field === 'height_cm' || field === 'width_cm') {
        const heightCm = parseFloat(data.height_cm)
        const widthCm = parseFloat(data.width_cm)

        if (!isNaN(heightCm) && !isNaN(widthCm)) {
          // Convert to inches, add 2 inches, convert back to cm
          const heightInInches = heightCm / 2.54
          const widthInInches = widthCm / 2.54;
          (data as any).height_with_frame_inches = (heightInInches + 2).toFixed(1);
          (data as any).width_with_frame_inches = (widthInInches + 2).toFixed(1);
          (data as any).height_with_frame_cm = ((heightInInches + 2) * 2.54).toFixed(1);
          (data as any).width_with_frame_cm = ((widthInInches + 2) * 2.54).toFixed(1)
        }
      }

      return data
    }

    let finalArtwork = performAutoCalculations({ ...updatedArtwork })

    // Auto-calculate start price when low_est changes
    if (field === 'low_est' && typeof value === 'string' && value) {
      const lowEst = parseFloat(value)
      if (!isNaN(lowEst)) {
        const startPrice = generateStartPrice(lowEst)
        const reservePrice = startPrice // Reserve = start price
        finalArtwork = {
          ...finalArtwork,
          start_price: startPrice.toString(),
          reserve: reservePrice.toString()
        }
      }
    }

    // Auto-calculate reserve price when start_price changes
    if (field === 'start_price' && typeof value === 'string' && value) {
      const startPrice = parseFloat(value)
      if (!isNaN(startPrice)) {
        const reservePrice = startPrice // Reserve = start price
        finalArtwork = { ...finalArtwork, reserve: reservePrice.toString() }
      }
    }

    // Auto-generate title when related fields change
    if (['artist_id', 'artwork_subject', 'medium', 'signature_placement', 'period_age'].includes(field)) {
          // Use the centralized title generation function
      const autoTitle = generateAutoTitle(finalArtwork)

          // Update title if we have meaningful content
          if (autoTitle && autoTitle !== 'Untitled') {
        finalArtwork = { ...finalArtwork, [field as keyof ArtworkFormData]: value, title: autoTitle }
          }
    }

    // Update the artworks array with the final calculated data
    setArtworks(prev => prev.map((artwork, index) =>
      index === activeArtworkIndex ? finalArtwork : artwork
    ))

    // Clear validation errors when user starts typing
    setValidationErrors([])
  }

  const handleImageChange = (index: number, url: string, file?: File) => {
    console.log('handleImageChange', index, url, file)
    setArtworks(prev => prev.map((artwork, artworkIndex) => {
      if (artworkIndex !== activeArtworkIndex) return artwork

      const newImages = [...artwork.images]
      // Ensure array has enough slots
      while (newImages.length <= index) {
        newImages.push('')
      }
      newImages[index] = url
      return { ...artwork, images: newImages }
    }))

    if (file) {
      setPendingImages(prev => ({ ...prev, [`artwork_${activeArtworkIndex}_image_${index}`]: file }))
    } else {
      // Remove from pending if it's just a URL
      setPendingImages(prev => {
        const updated = { ...prev }
        delete updated[`artwork_${activeArtworkIndex}_image_${index}`]
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
        if (!currentArtwork.images[i] || currentArtwork.images[i] === '') {
          availableSlots.push(i)
        }
      }
      return availableSlots
    }

    const availableSlots = getNextAvailableSlots()
    const filesToProcess = Array.from(files).slice(0, availableSlots.length)

    if (filesToProcess.length === 0) {
      alert('All image slots are already filled. Please remove some images first.')
      return
    }

    if (filesToProcess.length < files.length) {
      alert(`Only ${filesToProcess.length} files can be added (remaining slots available)`)
    }

    filesToProcess.forEach((file, index) => {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image`)
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large (max 10MB)`)
        return
      }

      // Use next available slot
      const slotIndex = availableSlots[index]

      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(file)

      // Update item data and pending images
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

    // Update current artwork data with preview URL
    setArtworks(prev => prev.map((artwork, index) =>
      index === activeArtworkIndex
        ? { ...artwork, [certificationType]: previewUrl }
        : artwork
    ))

    // Store pending file
    setPendingCertificationFiles(prev => ({
      ...prev,
      [certificationType]: file
    }))
  }

  // Get count of filled image slots for current artwork
  const getFilledSlotsCount = (): number => {
    return currentArtwork.images.filter(url => url && url.trim() !== '').length
  }

  const validateAllArtworks = (): string[] => {
    const errs: string[] = []

    // Validate client info - either client_id OR new client info is required
    const hasClientId = clientId?.trim()
    const hasClientInfo = clientInfo.first_name?.trim() && clientInfo.last_name?.trim() && clientInfo.email?.trim()

    if (!hasClientId && !hasClientInfo) {
      errs.push('Either provide an existing Client ID or fill out new client information')
    }

    if (!hasClientId) {
      // Validate new client info if no client ID provided
      if (!clientInfo.first_name?.trim()) errs.push('First name is required')
      if (!clientInfo.last_name?.trim()) errs.push('Last name is required')
      if (!clientInfo.email?.trim()) errs.push('Email is required')
    }

    // Validate each artwork
    artworks.forEach((artwork, index) => {
      const artworkLabel = `Inventory Item ${index + 1}`
      if (!artwork.title.trim()) errs.push(`${artworkLabel}: Title is required`)
      if (!artwork.description.trim()) errs.push(`${artworkLabel}: Description is required`)
      const low = Number(artwork.low_est)
      const high = Number(artwork.high_est)
      if (!Number.isFinite(low) || low <= 0) errs.push(`${artworkLabel}: Low estimate must be > 0`)
      if (!Number.isFinite(high) || high <= 0) errs.push(`${artworkLabel}: High estimate must be > 0`)
      if (Number.isFinite(low) && Number.isFinite(high) && low >= high) {
        errs.push(`${artworkLabel}: High estimate must be greater than low estimate`)
      }
    })

    return errs
  }

  const onSubmit = async () => {
    setError(null)
    setMessage(null)
    const errs = validateAllArtworks()
    if (errs.length > 0) {
      setValidationErrors(errs)
      setError('Please fix the validation errors below')
      return
    }
    setSubmitting(true)
    try {
      // Convert images to data URLs (base64) for each artwork
      const serializeArtworkImages = async (artworkIndex: number): Promise<string[]> => {
        const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result))
          r.onerror = () => reject(new Error('read error'))
          r.readAsDataURL(f)
        })

        const artworkImages: string[] = []
        const artwork = artworks[artworkIndex]

        for (let j = 0; j < Math.min(artwork.images.length, 10); j++) {
          const imageKey = `artwork_${artworkIndex}_image_${j}`
          if (pendingImages[imageKey]) {
            artworkImages.push(await toDataUrl(pendingImages[imageKey]))
          } else if (artwork.images[j]) {
            artworkImages.push(artwork.images[j])
          }
        }

        return artworkImages
      }

      // Process all artworks
      const payloadItems = await Promise.all(
        artworks.map(async (artwork, index) => {
          const images = await serializeArtworkImages(index)

          return {
            title: artwork.title,
            description: artwork.description,
            low_est: Number(artwork.low_est),
            high_est: Number(artwork.high_est),
            start_price: artwork.start_price ? Number(artwork.start_price) : undefined,
            condition: artwork.condition || undefined,
            reserve: artwork.reserve ? Number(artwork.reserve) : undefined,
            category: artwork.category || undefined,
            subcategory: artwork.subcategory || undefined,
            height_inches: artwork.height_inches || undefined,
            width_inches: artwork.width_inches || undefined,
            height_cm: artwork.height_cm || undefined,
            width_cm: artwork.width_cm || undefined,
            height_with_frame_inches: artwork.height_with_frame_inches || undefined,
            width_with_frame_inches: artwork.width_with_frame_inches || undefined,
            height_with_frame_cm: artwork.height_with_frame_cm || undefined,
            width_with_frame_cm: artwork.width_with_frame_cm || undefined,
            weight: artwork.weight || undefined,
            materials: artwork.materials || undefined,
            artist_id: artwork.artist_id ? Number(artwork.artist_id) : undefined,
            school_id: artwork.school_id || undefined,
            period_age: artwork.period_age || undefined,
            provenance: artwork.provenance || undefined,
            artwork_subject: artwork.artwork_subject || undefined,
            signature_placement: artwork.signature_placement || undefined,
            medium: artwork.medium || undefined,
            include_artist_description: artwork.include_artist_description,
            include_artist_key_description: artwork.include_artist_key_description,
            include_artist_biography: artwork.include_artist_biography,
            include_artist_notable_works: artwork.include_artist_notable_works,
            include_artist_major_exhibitions: artwork.include_artist_major_exhibitions,
            include_artist_awards_honors: artwork.include_artist_awards_honors,
            include_artist_market_value_range: artwork.include_artist_market_value_range,
            include_artist_signature_style: artwork.include_artist_signature_style,
            condition_report: artwork.condition_report || undefined,
            gallery_certification: artwork.gallery_certification,
            gallery_id: artwork.gallery_id || undefined,
            artist_certification: artwork.artist_certification,
            certified_artist_id: artwork.certified_artist_id || undefined,
            artist_family_certification: artwork.artist_family_certification,
            restoration_done: artwork.restoration_done,
            restoration_by: artwork.restoration_by || undefined,
            images
          }
        })
      )

      const payload = {
        client_id: clientId?.trim() || undefined,
        client_info: clientId?.trim() ? undefined : clientInfo,
        items: payloadItems,
      }
      const resp = await submitPendingItems(payload)
      setMessage(`Submitted successfully. Reference: ${resp.submission_token}`)

      // Reset form
      setArtworks([createInitialArtworkData()])
      setActiveArtworkIndex(0)
      setClientId('')
      setClientInfo({})
      setPendingImages({})
      setPendingCertificationFiles({})
      setValidationErrors([])
    } catch (e: any) {
      setError(e.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'client', label: 'Your Info', icon: '👤', description: 'Enter your contact information' },
    { id: 'basic', label: 'Basic Info', icon: '📝', description: 'Add artwork details and artist information' },
    { id: 'details', label: 'Details', icon: '🔍', description: 'Pricing, category and dimensions' },
    { id: 'images', label: 'Images', icon: '🖼️', description: 'Upload artwork photos' },
    { id: 'preview', label: 'Preview', icon: '👁️', description: 'Review and submit for approval' }
  ]

  // Navigation helpers
  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === tabs.length - 1
  const canProceedToNext = () => {
    if (activeTab === 'client') {
      const hasClientId = clientId?.trim()
      const hasClientInfo = clientInfo.first_name?.trim() && clientInfo.last_name?.trim() && clientInfo.email?.trim()
      return hasClientId || hasClientInfo
    }
    if (activeTab === 'basic') {
      return currentArtwork.title?.trim() && currentArtwork.description?.trim()
    }
    if (activeTab === 'details') {
      const lowEst = Number(currentArtwork.low_est)
      const highEst = Number(currentArtwork.high_est)
      return Number.isFinite(lowEst) && lowEst > 0 && Number.isFinite(highEst) && highEst > 0 && lowEst < highEst
    }
    if (activeTab === 'images') {
      return currentArtwork.images.some(img => img && img.trim())
    }
    return true
  }

  const goToNextTab = () => {
    if (!isLastTab && canProceedToNext()) {
      setActiveTab(tabs[currentTabIndex + 1].id)
    }
  }

  const goToPrevTab = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1].id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto bg-white border rounded-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Submission</h1>
              <p className="text-gray-600">Submit multiple inventory items for review. We'll contact you after approval.</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.href = '/items'}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>

          {/* Error and Message Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">{message}</div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Client Info Section - Separate from Items */}
        {activeTab === 'client' && (
          <div className="p-6 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <span className="text-blue-600 text-lg">👤</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-900">Your Contact Information</h2>
                <p className="text-blue-700 text-sm">We need this to contact you about your submission</p>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Items Section - Only show when not on client tab */}
        {activeTab !== 'client' && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="bg-teal-100 rounded-full p-2 mr-3">
                  <span className="text-teal-600 text-lg">🎨</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Items ({artworks.length})</h3>
                  <p className="text-gray-600 text-sm">Manage your artwork submissions</p>
                </div>
              </div>
              <button
                onClick={addArtwork}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 active:bg-teal-800 active:scale-95 hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-200 shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-1 transition-transform duration-200 active:scale-110" />
                Add Inventory
              </button>
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {artworks.map((artwork, index) => (
                <div key={artwork.id} className="flex items-center">
                  <button
                    onClick={() => setActiveArtworkIndex(index)}
                    className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${activeArtworkIndex === index
                        ? 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 active:scale-95 shadow-md hover:shadow-lg hover:shadow-teal-500/25 focus:ring-teal-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 active:scale-95 hover:shadow-md focus:ring-gray-500'
                      }`}
                  >
                    Inventory {index + 1}
                    {artwork.title && `: ${artwork.title.substring(0, 20)}${artwork.title.length > 20 ? '...' : ''}`}
                  </button>
                  {artworks.length > 1 && (
                    <button
                      onClick={() => removeArtwork(index)}
                      className="ml-1 p-2 text-red-600 hover:bg-red-50 active:bg-red-100 active:scale-90 hover:text-red-700 rounded-md transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Remove this inventory item"
                    >
                      <X className="h-4 w-4 transition-transform duration-200 active:rotate-90" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {tabs.map((tab, index) => (
                <div key={tab.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-teal-600 border-teal-600 text-white' 
                      : index < currentTabIndex 
                        ? 'bg-green-100 border-green-500 text-green-600'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {index < currentTabIndex ? (
                      <span className="text-sm">✓</span>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  {index < tabs.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 transition-all duration-200 ${
                      index < currentTabIndex ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Step {currentTabIndex + 1} of {tabs.length}
            </div>
          </div>
        </div>

        {/* Current Tab Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{tabs[currentTabIndex]?.icon}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{tabs[currentTabIndex]?.label}</h2>
                <p className="text-sm text-gray-600">{tabs[currentTabIndex]?.description}</p>
              </div>
            </div>
            {!canProceedToNext() && activeTab !== 'preview' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <p className="text-xs text-yellow-800">
                  {activeTab === 'client' && 'Please provide your contact information'}
                  {activeTab === 'basic' && 'Please add title and description'}
                  {activeTab === 'details' && 'Please add valid price estimates'}
                  {activeTab === 'images' && 'Please upload at least one image'}
                </p>
              </div>
            )}
          </div>
        </div>

        <form className="p-6">
          {/* Client Info Tab */}
          {activeTab === 'client' && (
        <div className="space-y-6">
              <ClientInfoSection
                clientId={clientId}
                clientInfo={clientInfo}
                onClientIdChange={setClientId}
                onClientInfoChange={setClientInfo}
                isPublicForm={true}
              />
              </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Artist/School Selection */}
              <ArtistSchoolSelection
                artistId={currentArtwork.artist_id}
                schoolId={currentArtwork.school_id}
                artworkSubject={currentArtwork.artwork_subject}
                signaturePlacement={currentArtwork.signature_placement}
                medium={currentArtwork.medium}
                periodAge={currentArtwork.period_age}
                artists={artists}
                schools={schools}
                loadingArtistsSchools={loadingArtistsSchools}
                materialOptions={materialOptions}
                periodOptions={periodOptions}
                onFieldChange={handleInputChange}
                uniqueIdPrefix={`artwork_${activeArtworkIndex}_`}
              />

              {/* Title and Description */}
              <ArtworkDescriptionSection
                title={currentArtwork.title}
                description={currentArtwork.description}
                artistId={currentArtwork.artist_id}
                artists={artists}
                includeArtistDescription={currentArtwork.include_artist_description}
                includeArtistKeyDescription={currentArtwork.include_artist_key_description}
                includeArtistBiography={currentArtwork.include_artist_biography}
                includeArtistNotableWorks={currentArtwork.include_artist_notable_works}
                includeArtistMajorExhibitions={currentArtwork.include_artist_major_exhibitions}
                includeArtistAwardsHonors={currentArtwork.include_artist_awards_honors}
                includeArtistMarketValueRange={currentArtwork.include_artist_market_value_range}
                includeArtistSignatureStyle={currentArtwork.include_artist_signature_style}
                conditionReport={currentArtwork.condition_report}
                onFieldChange={handleInputChange}
                uniqueIdPrefix={`artwork_${activeArtworkIndex}_`}
              />

              {/* Certification Section */}
              <CertificationSection
                galleryCertification={currentArtwork.gallery_certification}
                galleryCertificationFile={currentArtwork.gallery_certification_file}
                galleryId={currentArtwork.gallery_id}
                artistCertification={currentArtwork.artist_certification}
                artistCertificationFile={currentArtwork.artist_certification_file}
                certifiedArtistId={currentArtwork.certified_artist_id}
                artistFamilyCertification={currentArtwork.artist_family_certification}
                artistFamilyCertificationFile={currentArtwork.artist_family_certification_file}
                restorationDone={currentArtwork.restoration_done}
                restorationDoneFile={currentArtwork.restoration_done_file}
                restorationBy={currentArtwork.restoration_by}
                onFieldChange={handleInputChange}
                onCertificationFileUpload={handleCertificationFileUpload}
                uniqueIdPrefix={`artwork_${activeArtworkIndex}_`}
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
                      value={currentArtwork.low_est}
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
                      value={currentArtwork.high_est}
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
                      value={currentArtwork.start_price}
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
                      value={currentArtwork.reserve}
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
                      value={currentArtwork.category}
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
                      value={currentArtwork.subcategory}
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
                      value={currentArtwork.condition}
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
                heightInches={currentArtwork.height_inches}
                widthInches={currentArtwork.width_inches}
                heightCm={currentArtwork.height_cm}
                widthCm={currentArtwork.width_cm}
                heightWithFrameInches={currentArtwork.height_with_frame_inches}
                widthWithFrameInches={currentArtwork.width_with_frame_inches}
                heightWithFrameCm={currentArtwork.height_with_frame_cm}
                widthWithFrameCm={currentArtwork.width_with_frame_cm}
                weight={currentArtwork.weight}
                onFieldChange={handleInputChange}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provenance
                </label>
                <textarea
                  rows={3}
                  value={currentArtwork.provenance}
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
                    key={`${activeArtworkIndex}_${i}`}
                    label={`Image ${i + 1}`}
                    value={currentArtwork.images[i] || ''}
                    onChange={(url, file) => handleImageChange(i, url, file)}
                    itemId={undefined}
                    imageIndex={i + 1}
                    required={i === 0} // First image is required
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
                    key={`${currentArtwork.include_artist_description}-${currentArtwork.include_artist_key_description}-${currentArtwork.include_artist_biography}-${currentArtwork.include_artist_notable_works}-${currentArtwork.include_artist_major_exhibitions}-${currentArtwork.include_artist_awards_honors}-${currentArtwork.include_artist_market_value_range}-${currentArtwork.include_artist_signature_style}`}
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
                    {currentArtwork.artist_id && (
                      <li>• Artist: {(() => {
                        const artist = artists.find(a => a.id?.toString() === currentArtwork.artist_id)
                        return artist ? artist.name : `ID: ${currentArtwork.artist_id}`
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

        {/* Navigation Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            {/* Previous Button */}
            <button
              type="button"
              onClick={goToPrevTab}
              disabled={isFirstTab}
              className={`flex items-center px-6 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isFirstTab
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95 focus:ring-gray-500'
              }`}
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </button>

            {/* Progress Hint */}
            <div className="text-center">
              {!canProceedToNext() && activeTab !== 'preview' && (
                <div className="flex items-center text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                  <span className="text-sm font-medium">⚠️ Complete required fields to continue</span>
                </div>
              )}
              {canProceedToNext() && activeTab !== 'preview' && (
                <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <span className="text-sm font-medium">✅ Ready to proceed</span>
                </div>
              )}
            </div>

            {/* Next/Submit Button */}
            {activeTab === 'preview' ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className={`flex items-center px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-600 disabled:hover:shadow-sm disabled:hover:-translate-y-0 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-teal-500/25 active:bg-teal-800 active:scale-95 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${submitting ? 'animate-pulse' : ''}`}
              >
                <Save className={`h-5 w-5 mr-2 transition-transform duration-200 ${submitting ? 'animate-spin' : 'active:scale-110'}`} />
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextTab}
                disabled={!canProceedToNext() || isLastTab}
                className={`flex items-center px-6 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  !canProceedToNext() || isLastTab
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-500/25 hover:-translate-y-0.5 active:bg-teal-800 active:scale-95 focus:ring-teal-500 shadow-md'
                }`}
              >
                Next
                <ChevronLeft className="h-5 w-5 ml-2 rotate-180" />
              </button>
            )}
          </div>

          {/* Progress Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {activeTab === 'client' && 'Step 1: Enter your contact information so we can reach you'}
              {activeTab === 'basic' && 'Step 2: Add basic artwork information and artist details'}
              {activeTab === 'details' && 'Step 3: Set pricing and provide detailed specifications'}
              {activeTab === 'images' && 'Step 4: Upload high-quality photos of your artwork'}
              {activeTab === 'preview' && 'Step 5: Review all information and submit for approval'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

