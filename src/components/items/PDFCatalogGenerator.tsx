// frontend/src/components/items/PDFCatalogGenerator.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Share2, Printer, Eye, Settings, Image, FileText, Grid, List, Layers } from 'lucide-react'
import { Artwork } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { fetchClient, Client } from '@/lib/clients-api'
import { ArtworkPreviewOptions, generateArtworkPreview } from '@/lib/artwork-preview'
import MediaRenderer from '@/components/ui/MediaRenderer'

// Unified catalog generator for all places in the admin app
// Define types for PDF catalog generation
interface CatalogOptions {
  includeTitle: boolean
  includeImages: boolean
  includeDescription: boolean
  includeArtist: boolean
  includeArtistBiography: boolean
  includeArtistDescription: boolean
  includeArtistExtraInfo: boolean
  includeDimensions: boolean
  includeCondition: boolean
  includeMaterials: boolean
  includeProvenance: boolean
  includeEstimates: boolean
  includeConsigner: boolean
  includeLotNumbers: boolean
  includeCategory: boolean
  includePeriodAge: boolean
  includeWeight: boolean
  includeImageCaptions: boolean
  layoutType: 'cards' | 'table' | 'detailed'
  itemsPerPage: number
  showPageNumbers: boolean
  catalogTitle: string
  catalogSubtitle: string
  includeHeader: boolean
  includeFooter: boolean
  logoUrl: string
  showBrandLogos: boolean
  imagesPerItem: number
  imageSize: 'small' | 'medium' | 'large'
  showImageBorder: boolean
}

interface BrandData {
  id: number
  name: string
  code: string
  logo_url?: string
}

interface ArtworkPreviewData extends Artwork {
  artist_name?: string
  consigner_name?: string
  images?: string[]
  image_urls?: string[]
  artist_maker?: string
}
// PDF generation now handled by backend API

interface UnifiedCatalogGeneratorProps {
  selectedArtworks: Artwork[]
  onClose: () => void
  source?: 'items' | 'auctions' | 'consignments' | 'invoices' // Where the catalog is being generated from
  customTitle?: string // Optional custom title override
  getSelectedArtworks?: () => Promise<Artwork[]> // Async function to get all selected artworks
}

// Interfaces moved to @/lib/pdf-catalog-generator

const getDefaultOptions = (brands: BrandData[], customTitle?: string): CatalogOptions => ({
  includeTitle: true,
  includeImages: true,
  includeDescription: true,
  includeArtist: true,
  includeArtistBiography: false,
  includeArtistDescription: false,
  includeArtistExtraInfo: false,
  includeDimensions: true,
  includeCondition: false,
  includeMaterials: false,
  includeProvenance: false,
  includeEstimates: true,
  includeConsigner: false,
  includeLotNumbers: true,
  includeCategory: false,
  includePeriodAge: false,
  includeWeight: false,
  includeImageCaptions: false,

  layoutType: 'cards',
  itemsPerPage: 4,
  showPageNumbers: true,
  catalogTitle: customTitle || (brands.length === 0 ? 'Private Sale' : 'Auction Catalog'),
  catalogSubtitle: '',
  includeHeader: true,
  includeFooter: true,
  logoUrl: '',
  showBrandLogos: true,
  imagesPerItem: 3, // Show first three images by default (unlimited support)
  imageSize: 'medium',
  showImageBorder: true
})

export default function UnifiedCatalogGenerator({
  selectedArtworks,
  onClose,
  source = 'items',
  customTitle,
  getSelectedArtworks
}: UnifiedCatalogGeneratorProps) {
  // Ensure selectedArtworks is an array
  const safeSelectedArtworks = Array.isArray(selectedArtworks) ? selectedArtworks : []

  const [options, setOptions] = useState<CatalogOptions>(getDefaultOptions([], customTitle))
  const [showSettings, setShowSettings] = useState(false)
  // const [generating, setGenerating] = useState(false)
  // const [previewMode, setPreviewMode] = useState(false)
  const [enrichedArtworks, setEnrichedArtworks] = useState<ArtworkPreviewData[]>([])
  const [loadingData, setLoadingData] = useState(true)
  // const [loadingImages, setLoadingImages] = useState(false)
  const [brands, setBrands] = useState<BrandData[]>([])
  const [loadedBrandLogos, setLoadedBrandLogos] = useState<Map<number, string>>(new Map())
  const [allSelectedArtworks, setAllSelectedArtworks] = useState<Artwork[]>([])
  const [loadingAllArtworks, setLoadingAllArtworks] = useState(false)
  const [generatingAction, setGeneratingAction] = useState<'download' | 'share' | 'print' | 'preview' | null>(null)
const [previewMode, setPreviewMode] = useState(false)

  // Ensure arrays are always arrays in case of minification issues
  useEffect(() => {
    if (!Array.isArray(enrichedArtworks)) {
      setEnrichedArtworks([])
    }
    if (!Array.isArray(allSelectedArtworks)) {
      setAllSelectedArtworks([])
    }
    if (!Array.isArray(brands)) {
      setBrands([])
    }
  }, [])

  // Load brand data and logos
  const loadBrandData = async () => {
    try {
      // Get unique brand IDs from selected artworks
      const brandIds = new Set<number>()
      safeSelectedArtworks.forEach(artwork => {
        if (artwork.brands?.id) {
          brandIds.add(artwork.brands.id)
        } else if (artwork.brand_id) {
          brandIds.add(artwork.brand_id)
        }
      })

      if (brandIds.size === 0) return

      // Fetch brand data
      const token = localStorage.getItem('token')
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const brandsData: BrandData[] = []
      const logoMap = new Map<number, string>()

      for (const brandId of brandIds) {
        try {
          const response = await fetch(`${backendUrl}/api/brands/${brandId}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            }
          })
          
          if (response.ok) {
            const brandResponse = await response.json()
            const brand = brandResponse.data
            brandsData.push(brand)

            // Load brand logo if available
            if (brand.logo_url) {
              try {
                const logoBase64 = await loadImageAsBase64(brand.logo_url)
                if (logoBase64) {
                  logoMap.set(brand.id, logoBase64)
                }
              } catch (logoError) {
                console.warn(`Failed to load logo for brand ${brand.name}:`, logoError)
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to load brand ${brandId}:`, error)
        }
      }

      setBrands(brandsData)
      setLoadedBrandLogos(logoMap)

      // Update options with brand-aware catalog title
      setOptions(prev => ({
        ...prev,
        catalogTitle: customTitle || (brandsData.length === 0 ? 'Private Sale' : 'Auction Catalog')
      }))
    } catch (error) {
      console.error('Failed to load brand data:', error)
    }
  }

  // Load all selected artworks if getSelectedArtworks is provided
  useEffect(() => {
    const loadAllSelectedArtworks = async () => {
      if (getSelectedArtworks) {
        setLoadingAllArtworks(true)
        try {
          const allArtworks = await getSelectedArtworks()
          setAllSelectedArtworks(allArtworks)
        } catch (error) {
          console.error('Failed to load all selected artworks:', error)
          setAllSelectedArtworks(safeSelectedArtworks) // fallback to prop
        } finally {
          setLoadingAllArtworks(false)
        }
      } else {
        setAllSelectedArtworks(safeSelectedArtworks)
      }
    }

    loadAllSelectedArtworks()
  }, [safeSelectedArtworks, getSelectedArtworks])

  // Load additional data for artworks (artists, clients, etc.)
  useEffect(() => {
    loadEnrichedData()
    loadBrandData()
  }, [allSelectedArtworks])

  const loadEnrichedData = async () => {
    try {
      setLoadingData(true)
      const enriched: ArtworkPreviewData[] = []

      for (const artwork of safeSelectedArtworks) {
        const enrichedArtwork: ArtworkPreviewData = { ...artwork }

        // Load artist data
        if (artwork.artist_id) {
          try {
            const artistResponse = await ArtistsAPI.getArtist(artwork.artist_id.toString())
            if (artistResponse.success) {
              (enrichedArtwork as any).artist = artistResponse.data
            }
          } catch (error) {
            console.error('Error loading artist:', error)
          }
        }

        // Load vendor client data
        if (artwork.vendor_id) {
          try {
            const clientResponse = await fetchClient(artwork.vendor_id)
            if (clientResponse.success) {
              (enrichedArtwork as any).consigner_client = clientResponse.data
            }
          } catch (error) {
            console.error('Error loading vendor:', error)
          }
        }

        enriched.push(enrichedArtwork)
      }

      setEnrichedArtworks(enriched)
    } catch (error) {
      console.error('Error loading enriched data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const generatePreviewData = () => {
    const previewOptions: ArtworkPreviewOptions = {
      includeTitle: options.includeTitle,
      includeDescription: options.includeDescription,
      includeArtist: options.includeArtist,
      includeArtistBiography: options.includeArtistBiography,
      includeArtistDescription: options.includeArtistDescription,
      includeArtistExtraInfo: options.includeArtistExtraInfo,
      includeDimensions: options.includeDimensions,
      includeCondition: options.includeCondition,
      includeMaterials: options.includeMaterials,
      includeProvenance: options.includeProvenance,
      includeEstimates: options.includeEstimates,
      includeConsigner: options.includeConsigner
    }

    // Ensure enrichedArtworks is an array
    if (!Array.isArray(enrichedArtworks)) {
      return []
    }

    return enrichedArtworks.map(artwork => ({
      ...artwork,
      previewText: generateArtworkPreview(artwork as any, previewOptions)
    }))
  }

  // Generate preview for all selected artworks (not just enriched ones)
  const generateAllArtworksPreview = () => {
    const previewOptions: ArtworkPreviewOptions = {
      includeTitle: options.includeTitle,
      includeDescription: options.includeDescription,
      includeArtist: options.includeArtist,
      includeArtistBiography: options.includeArtistBiography,
      includeArtistDescription: options.includeArtistDescription,
      includeArtistExtraInfo: options.includeArtistExtraInfo,
      includeDimensions: options.includeDimensions,
      includeCondition: options.includeCondition,
      includeMaterials: options.includeMaterials,
      includeProvenance: options.includeProvenance,
      includeEstimates: options.includeEstimates,
      includeConsigner: options.includeConsigner
    }

    // Ensure allSelectedArtworks is an array and has items
    if (!Array.isArray(allSelectedArtworks) || allSelectedArtworks.length === 0) {
      return []
    }

    return allSelectedArtworks.map(artwork => ({
      ...artwork,
      previewText: generateArtworkPreview(artwork as any, previewOptions)
    }))
  }

  // Helper function to load image from URL and convert to base64
  const loadImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 10000) // 10 second timeout
      })

      // Create the fetch promise
      const fetchPromise = (async () => {
        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })

        if (!response.ok) {
          console.warn(`Failed to load image: ${imageUrl} (${response.status})`)
          return null
        }

        const contentLength = response.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
          console.warn(`Image too large: ${imageUrl} (${contentLength} bytes)`)
          return null
        }

        const blob = await response.blob()

        // Check blob size
        if (blob.size > 10 * 1024 * 1024) { // 10MB limit
          console.warn(`Image blob too large: ${imageUrl} (${blob.size} bytes)`)
          return null
        }

        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => {
            console.warn(`Error reading image blob: ${imageUrl}`)
            resolve(null)
          }
          reader.readAsDataURL(blob)
        })
      })()

      // Race between fetch and timeout
      return await Promise.race([fetchPromise, timeoutPromise]) as string | null

    } catch (error) {
      console.warn(`Error loading image ${imageUrl}:`, error)
      return null
    }
  }

  // Helper function to get the best available image URL
  const getBestImageUrl = (artwork: ArtworkPreviewData): string | null => {
    // Check for new images array format (unlimited images)
    if (artwork.images && Array.isArray(artwork.images) && artwork.images.length > 0) {
      // Return the first non-blob URL image
      for (const url of artwork.images) {
        if (url && url.trim() && !url.includes('blob:')) {
          return url
        }
      }
    }

    // Fallback to old image_file format for backward compatibility
    const imageFields = ['image_file_1', 'image_file_2', 'image_file_3', 'image_file_4', 'image_file_5']
    for (const field of imageFields) {
      const url = (artwork as any)[field]
      if (url && url.trim() && !url.includes('blob:')) { // Skip blob URLs as they're temporary
        return url
      }
    }
    return null
  }

  // Share support detection
  const [supportsNativeShare, setSupportsNativeShare] = useState(false)


  // Share PDF with native share API (direct share)
  const shareViaNative = async (pdfBlob: Blob, fileName: string) => {
    try {
      // Check if Web Share API with files is supported
      const testFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [testFile] })) {
        console.log('Web Share API with files is supported, attempting to share...');

        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        await navigator.share({
          title: `Artwork Catalog: ${options.catalogTitle}`,
          text: `Artwork catalog generated on ${new Date().toLocaleDateString()}`,
          files: [file]
        });

        console.log('PDF shared successfully via Web Share API');
      } else {
        console.log('Web Share API with files not supported, falling back to download');
        throw new Error('Web Share API not supported');
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return;
      console.error('Error sharing via Web Share API:', error);

      // Fallback: Force download for manual sharing
      try {
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(downloadUrl);

        alert(`PDF downloaded as "${fileName}". You can now attach it to emails or share it manually.`);
        console.log('PDF download fallback completed successfully');
      } catch (downloadError) {
        console.error('Error in download fallback:', downloadError);
        alert('Failed to download PDF. Please try again or contact support.');
      }
    }
  };

  // Generate PDF using backend API (PDFKit)
  const generatePDFNew = async (action: 'download' | 'share' | 'print' | 'preview') => {
    try {
      setGeneratingAction(action)

      // Get selected artworks - use async function if available, otherwise use prop
      let artworksToUse = safeSelectedArtworks
      if (getSelectedArtworks) {
        artworksToUse = await getSelectedArtworks()
      }

      // Ensure artworksToUse is an array
      if (!Array.isArray(artworksToUse)) {
        artworksToUse = []
      }

      // Get selected artwork IDs
      const itemIds = artworksToUse.map(artwork => artwork.id).filter(id => id)

      if (itemIds.length === 0) {
        alert('No artworks selected for PDF generation')
        return
      }

      // Prepare request data
      const requestData = {
        item_ids: itemIds,
        options: options,
        brand_code: undefined // Can be added later if needed
      }

      // Call backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/items/generate-pdf-catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PDF')
      }

      // Get PDF blob from response
      const pdfBlob = await response.blob()



      // Generate filename with Windows/Outlook compatible sanitization
      const sanitizeFilename = (title: string): string => {
        // Replace invalid Windows filename characters with underscores
        let sanitized = title.replace(/[<>:"|?*\\]/g, '_');
        // Remove or replace other problematic characters, keep alphanumeric and common punctuation
        // Replace spaces with underscores for better email attachment compatibility
        sanitized = sanitized.replace(/[^a-zA-Z0-9\-_.]/g, '_');
        // Replace multiple consecutive underscores with single underscore
        sanitized = sanitized.replace(/_+/g, '_');
        // Remove leading/trailing underscores
        sanitized = sanitized.replace(/^_+|_+$/g, '');
        // Ensure we have a valid filename, fallback to 'catalog' if empty
        return sanitized || 'catalog';
      };

      const sanitizedTitle = sanitizeFilename(options.catalogTitle);
      const fileName = `catalog_${sanitizedTitle.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`

      // Handle different actions
      switch (action) {
        case 'download':
          const downloadUrl = URL.createObjectURL(pdfBlob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
          break
        case 'print':
          const printUrl = URL.createObjectURL(pdfBlob)
          const printWindow = window.open(printUrl, '_blank')
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.print()
            }
          }
          break
        case 'share':
          // Directly share PDF with native share API
          await shareViaNative(pdfBlob, fileName)
          break
        case 'preview':
          const previewUrl = URL.createObjectURL(pdfBlob)
          window.open(previewUrl, '_blank')
          break
      }

    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert(`Error generating PDF: ${error.message}`)
    } finally {
      setGeneratingAction(null)
    }
  }

  const updateOption = (key: keyof CatalogOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading artwork data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Generate PDF Catalog</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Catalog Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Options */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Content Options</h5>
                  <div className="space-y-2">
                    {[
                      { key: 'includeTitle', label: 'Include Title' },
                      { key: 'includeImages', label: 'Include Images' },
                      { key: 'includeDescription', label: 'Include Description' },
                      { key: 'includeArtist', label: 'Include Artist' },
                      { key: 'includeDimensions', label: 'Include Dimensions' },
                      { key: 'includeEstimates', label: 'Include Estimates' },
                      { key: 'includeLotNumbers', label: 'Include Lot Numbers' },
                      { key: 'includeCondition', label: 'Include Condition' },
                      { key: 'includeMaterials', label: 'Include Materials' },
                      { key: 'includeProvenance', label: 'Include Provenance' },
                      { key: 'includeCategory', label: 'Include Category' },
                      { key: 'includePeriodAge', label: 'Include Period/Age' },
                      { key: 'includeWeight', label: 'Include Weight' },
                      { key: 'includeImageCaptions', label: 'Include Image Captions' }
                    ].map(option => (
                      <label key={option.key} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={options[option.key as keyof CatalogOptions] as boolean}
                          onChange={(e) => updateOption(option.key as keyof CatalogOptions, e.target.checked)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Layout Options */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Layout Options</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Catalog Title</label>
                      <input
                        type="text"
                        value={options.catalogTitle}
                        onChange={(e) => updateOption('catalogTitle', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                    {options.layoutType !== 'table' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Items per Page</label>
                        <select
                          value={options.itemsPerPage}
                          onChange={(e) => updateOption('itemsPerPage', parseInt(e.target.value))}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value={2}>2</option>
                          <option value={4}>4</option>
                          <option value={6}>6</option>
                          <option value={8}>8</option>
                        </select>
                      </div>
                    )}
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={options.showPageNumbers}
                        onChange={(e) => updateOption('showPageNumbers', e.target.checked)}
                        className="mr-2"
                      />
                      Show Page Numbers
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={options.showBrandLogos}
                        onChange={(e) => updateOption('showBrandLogos', e.target.checked)}
                        className="mr-2"
                      />
                      Show Brand Logos ({brands.length} brand{brands.length !== 1 ? 's' : ''} detected)
                    </label>
                    
                    {/* Image Options */}
                    {options.includeImages && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Images per Item</label>
                          <select
                            value={options.imagesPerItem}
                            onChange={(e) => updateOption('imagesPerItem', parseInt(e.target.value))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value={1}>1 Image</option>
                            <option value={2}>2 Images</option>
                            <option value={3}>3 Images</option>
                            <option value={4}>4 Images</option>
                            <option value={5}>5 Images</option>
                            <option value={6}>6 Images</option>
                            <option value={8}>8 Images</option>
                            <option value={10}>10 Images</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Image Size</label>
                          <select
                            value={options.imageSize}
                            onChange={(e) => updateOption('imageSize', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={options.showImageBorder}
                            onChange={(e) => updateOption('showImageBorder', e.target.checked)}
                            className="mr-2"
                          />
                          Show Image Border
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Artwork Count */}
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              Ready to generate catalog for <span className="font-semibold">{loadingAllArtworks ? '...' : allSelectedArtworks.length}</span> artwork(s)
              {getSelectedArtworks && !loadingAllArtworks && <span className="text-xs text-blue-600 block mt-1">Including items from all pages</span>}
            </p>
          </div>

          {/* Preview */}
          {!showSettings && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Preview</h4>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                {loadingAllArtworks ? (
                  <div className="text-center text-gray-500 py-4">Loading all selected artworks...</div>
                ) : (
                  <>
                    {generateAllArtworksPreview().slice(0, 3).map((artwork, index) => (
                      <div key={artwork.id || index} className="mb-4 p-3 bg-white rounded border">
                        {options.includeLotNumbers && artwork.id && (
                          <div className="font-semibold text-sm mb-2">Lot {artwork.id}</div>
                        )}
                        <div
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: artwork.previewText.replace(/<br\s*\/?>/gi, '<br>')
                          }}
                        />
                        {options.includeImages && getBestImageUrl(artwork) && (
                          <div className="mt-2">
                            <MediaRenderer
                              src={getBestImageUrl(artwork) || ''}
                              alt={artwork.title || 'Artwork'}
                              className="w-16 h-16 border border-gray-300 rounded"
                              aspectRatio="square"
                              placeholder={
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 border border-gray-300 rounded">
                                  <Image className="h-6 w-6" />
                                </div>
                              }
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    {allSelectedArtworks.length > 3 && (
                      <div className="text-sm text-gray-500 text-center">
                        ... and {allSelectedArtworks.length - 3} more artwork(s)
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => generatePDFNew('preview')}
              disabled={generatingAction !== null}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              {generatingAction === 'preview' ? 'Generating...' : 'Preview PDF'}
            </button>

            <button
              onClick={() => generatePDFNew('download')}
              disabled={generatingAction !== null}
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {generatingAction === 'download' ? 'Downloading...' : 'Download PDF'}
            </button>

            <button
              onClick={() => generatePDFNew('share')}
              disabled={generatingAction !== null}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {generatingAction === 'share' ? 'Sharing...' : 'Share PDF'}
            </button>

            <button
              onClick={() => generatePDFNew('print')}
              disabled={generatingAction !== null}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              {generatingAction === 'print' ? 'Printing...' : 'Print PDF'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
