// frontend/src/components/items/ImportExportDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Upload, Download, FileText, Globe, AlertCircle, CheckCircle } from 'lucide-react'
import { ArtworksAPI } from '@/lib/items-api'
import { 
  loadBrandGoogleSheetUrl, 
  saveBrandGoogleSheetUrl,
  syncArtworksFromGoogleSheet,
  getApiBaseUrl 
} from '@/lib/google-sheets-api'
import { getAuctions, type Auction } from '@/lib/auctions-api'
import SearchableSelect, { type SearchableOption } from '@/components/ui/SearchableSelect'

interface ImportExportDialogProps {
  mode: 'import' | 'export'
  onClose: () => void
  onComplete?: (result: any) => void
  selectedItems?: string[]
  brand?: string
}

type Format = 'csv' | 'spreadsheet'
type Platform = 'database' | 'liveauctioneers' | 'easy_live' | 'the_saleroom' | 'invaluable'

interface PlatformConfig {
  label: string
  description: string
  csvHeaders: string[]
  requiredFields: string[]
  sampleData?: string[]
  supportsAllFields?: boolean
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  database: {
    label: 'Our Database',
    description: 'Full format with all available fields including brand and return information',
    csvHeaders: [
      'id', 'title', 'description', 'low_est', 'high_est', 'start_price', 'reserve', 'condition', 'consignment_id',
      'status', 'category', 'subcategory', 'height_inches', 'width_inches', 'height_cm', 'width_cm',
      'height_with_frame_inches', 'width_with_frame_inches', 'height_with_frame_cm', 'width_with_frame_cm',
      'weight', 'materials', 'artist_maker', 'period_age', 'provenance',
      'artist_id', 'school_id', 'condition_report', 'gallery_certification', 'gallery_certification_file', 'gallery_id', 'artist_certification', 'artist_certification_file', 'certified_artist_id', 'artist_family_certification', 'artist_family_certification_file',
      'restoration_done', 'restoration_done_file', 'restoration_by', 'images',
      'include_artist_description', 'include_artist_key_description', 'include_artist_biography', 'include_artist_notable_works',
      'include_artist_major_exhibitions', 'include_artist_awards_honors', 'include_artist_market_value_range', 'include_artist_signature_style',
      'brand_id',
      'return_date', 'return_location', 'return_reason', 'returned_by_user_id', 'returned_by_user_name',
      'date_sold', 'created_at', 'updated_at'
    ],
    requiredFields: ['title', 'description'],
    supportsAllFields: true
  },
  liveauctioneers: {
    label: 'LiveAuctioneers',
    description: 'Compatible with LiveAuctioneers CSV format',
    csvHeaders: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst', 'StartPrice', 'ReservePrice', 'Buy Now Price', 'Exclude From Buy Now', 'Condition', 'Category', 'Origin', 'Style & Period', 'Creator', 'Materials & Techniques', 'Reserve Price', 'Domestic Flat Shipping Price', 'Height', 'Width', 'Depth', 'Dimension Unit', 'Weight', 'Weight Unit', 'Quantity'],
    requiredFields: ['Title', 'Description', 'LowEst', 'HighEst'],
    sampleData: ['1', 'MAQBOOL FIDA HUSAIN (1915-2011) WATERCOLOUR ON PAPER SIGNED LOWER RIGHT', 'MAQBOOL FIDA HUSAIN (1915-2011) WATERCOLOUR ON PAPER\n\nTHESE WORKS ARE HIGHLY SOUGHT AFTER, MUCH LIKE THOSE BY RENOWNED ARTISTS SUCH AS M.F. HUSAIN, S.H. RAZA, F.N. SOUZA, AKBAR PADAMSEE, HEMENDRANATH MAZUMDAR, RAM KUMAR, JAMINI ROY, B. PRABHA, TYEB MEHTA, AND MANY OTHERS. THEY ARE OFTEN SOLD BY AUCTIONEERS TO COLLECTORS AROUND THE GLOBE\n\n30 X 22 INCHES', '4000', '6000', '800', '800', '', '', '', 'Furniture', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  },
  easy_live: {
    label: 'Easy Live Auction',
    description: 'Compatible with Easy Live Auction CSV format',
    csvHeaders: ['LotNo', 'Description', 'Condition Report', 'LowEst', 'HighEst', 'Category'],
    requiredFields: ['LotNo', 'Description', 'LowEst', 'HighEst'],
    sampleData: ['1', 'Example Lot 1', 'Condition Report 1', '10', '10', 'Furniture']
  },
  the_saleroom: {
    label: 'The Saleroom',
    description: 'Compatible with The Saleroom CSV format',
    csvHeaders: ['Number', 'Title', 'Description', 'Hammer', 'Reserve', 'StartPrice', 'Increment', 'Quantity', 'LowEstimate', 'HighEstimate', 'CategoryCode', 'Sales Tax/VAT', 'BuyersPremiumRate', 'BuyersPremiumCeiling', 'InternetSurchargeRate', 'InternetSurchargeCeiling', 'BuyersPremiumVatRate', 'InternetSurchargeVatRate', 'End Date', 'End Time', 'Lot Link', 'Main Image', 'ExtraImages', 'BuyItNowPrice', 'IsBulk', 'Artist\'s Resale Right Applies', 'Address1', 'Address2', 'Address3', 'Address4', 'Postcode', 'TownCity', 'CountyState', 'CountryCode', 'ShippingInfo'],
    requiredFields: ['Number', 'Title', 'Description', 'LowEstimate', 'HighEstimate'],
    sampleData: ['1', 'Pierre Jeanneret (1896-1967) Desk designed for the Administrative buildings, Chandigarh, North ...', '<p><strong>Pierre Jeanneret (1896-1967)&nbsp;</strong><br><br>Desk designed for the Administrative buildings, Chandigarh, North India, circa 1957&nbsp;<br>Teak, leather inset top&nbsp;<br>71.5cm high, 121.5cm wide, 84cm deep&nbsp;<br><br><strong>Literature&nbsp;</strong><br>Patrick Seguin, \'Le Corbusier, Pierre Jeanneret, Chandigarh India\', Galerie Patrick Seguin, Paris, 2014, p.288&nbsp;</p> <p><strong>Provenance&nbsp;</strong><br>Vigo Gallery, London&nbsp;</p> Condition Report:  <p>Professional restoration towards bottom of front right support, overall general surface wear to include scratches, scuffs and marks commensurate with age and use.</p>', '2000.00', '2000.00', '1400.00', '', '1', '2000.00', '2500.00', 'FUR', '', '', '', '', '', '', '', '13/08/2025', '10:00', 'en-gb/auction-catalogues/metsab/catalogue-id-metsab10000/lot-a81ba4c4-f7fb-462a-9520-b33800c32b65', 'https://cdn.globalauctionplatform.com/54b11a1b-bf41-4c81-b480-b33800c14324/78df6eb5-4bde-440b-9f50-b33800c41734/original.jpg', 'https://cdn.globalauctionplatform.com/54b11a1b-bf41-4c81-b480-b33800c14324/6a526f16-4f89-4239-bf90-b33800c41895/original.jpg', '', 'False', 'False', '', '', '', '', '', '', '', '']
  },
  invaluable: {
    label: 'Invaluable',
    description: 'Compatible with Invaluable CSV format',
    csvHeaders: ['id', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'category', 'dimensions'],
    requiredFields: ['id', 'title', 'description', 'low_est', 'high_est']
  }
}

export default function ImportExportDialog({
  mode,
  onClose,
  onComplete,
  selectedItems = [],
  brand = 'MSABER'
}: ImportExportDialogProps) {
  const [brands, setBrands] = useState<Array<{id: number, code: string, name: string}>>([])
  const [selectedBrand, setSelectedBrand] = useState(brand)
  const [format, setFormat] = useState<Format>('csv')
  const [platform, setPlatform] = useState<Platform>('database')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState('')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [driveFolderUrl, setDriveFolderUrl] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    mapping_preview: Record<string, { images: { filename: string; url: string; fileId: string }[]; count: number }>;
    total_files: number;
    mapped_ids: number;
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [syncBackToSheets, setSyncBackToSheets] = useState(false)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [selectedAuction, setSelectedAuction] = useState<number | undefined>(undefined)
  const [auctionsLoading, setAuctionsLoading] = useState(false)

  // Helper function to check for multiline content in CSV
  const checkForMultilineContent = (csvText: string): boolean => {
    if (!csvText) return false

    const lines = csvText.split('\n')
    let inQuotes = false
    let multilineDetected = false

    for (const line of lines) {
      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          if (!inQuotes) {
            inQuotes = true
          } else if (i < line.length - 1 && line[i + 1] === '"') {
            // Escaped quote, skip next
            i++
          } else {
            inQuotes = false
          }
        }
      }

      // If we're still in quotes at end of line, this is multiline
      if (inQuotes) {
        multilineDetected = true
      }
    }

    return multilineDetected
  }

  // Google Sheets configuration
  const [hasGoogleSheetConfig, setHasGoogleSheetConfig] = useState(false)
  const [showUrlConfig, setShowUrlConfig] = useState(false)
  const [editingUrl, setEditingUrl] = useState('')

  useEffect(() => {
    if (format === 'spreadsheet') {
      loadGoogleSheetConfig()
    }
  }, [format, selectedBrand])

  // Load brands
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/brands`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setBrands(data.data)
        } else {
          console.error('Failed to load brands:', response.status)
        }
      } catch (error) {
        console.error('Failed to load brands:', error)
      }
    }

    loadBrands()
  }, [])

  // Load auctions initially (all auctions)
  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setAuctionsLoading(true)
        const response = await getAuctions({ limit: 1000 })
        if (response.auctions) {
          setAuctions(response.auctions)
        }
      } catch (error) {
        console.error('Failed to load auctions:', error)
      } finally {
        setAuctionsLoading(false)
      }
    }

    loadAuctions()
  }, [])

  // Filter auctions by brand when brand changes
  const filteredAuctions = React.useMemo(() => {
    if (!selectedBrand) return auctions
    const selectedBrandObj = brands.find(b => b.code === selectedBrand)
    if (!selectedBrandObj) return auctions
    return auctions.filter(auction => auction.brand_id === selectedBrandObj.id)
  }, [auctions, selectedBrand, brands])

  // Clear selected auction when brand changes if it doesn't match
  useEffect(() => {
    if (selectedAuction) {
      const auction = auctions.find(a => a.id === selectedAuction)
      if (auction) {
        const selectedBrandObj = brands.find(b => b.code === selectedBrand)
        if (selectedBrandObj && auction.brand_id !== selectedBrandObj.id) {
          setSelectedAuction(undefined)
        }
      }
    }
  }, [selectedBrand, auctions, brands, selectedAuction])

  // Prepare auction options for SearchableSelect
  const auctionOptions: SearchableOption<number>[] = filteredAuctions.map(auction => ({
    value: auction.id,
    label: auction.short_name || auction.long_name || `Auction #${auction.id}`,
    description: auction.long_name || undefined
  }))

  const loadGoogleSheetConfig = async () => {
    try {
      const url = await loadBrandGoogleSheetUrl(selectedBrand, 'artworks')
      if (url) {
        setGoogleSheetUrl(url)
        setHasGoogleSheetConfig(true)
      } else {
        setHasGoogleSheetConfig(false)
      }
    } catch (error) {
      console.error('Error loading Google Sheet config:', error)
      setHasGoogleSheetConfig(false)
    }
  }

  const saveGoogleSheetConfig = async () => {
    try {
      const success = await saveBrandGoogleSheetUrl(selectedBrand, editingUrl, 'artworks')
      if (success) {
        setGoogleSheetUrl(editingUrl)
        setHasGoogleSheetConfig(true)
        setShowUrlConfig(false)
        setSuccess('Google Sheets URL saved successfully!')
      } else {
        setError('Failed to save Google Sheets URL')
      }
    } catch (error) {
      console.error('Error saving Google Sheet config:', error)
      setError('Failed to save Google Sheets URL')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setCsvData(e.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const validateCSV = async () => {
    try {
      setLoading(true)
      setError('')

      const result = await ArtworksAPI.validateCSV(csvData, platform as any)

      if (result.success && result.validation_result) {
        const { total_rows, valid_rows, errors } = result.validation_result
        setProgress(`Validation complete: ${valid_rows}/${total_rows} rows valid`)

        // Check for multiline content and show informational message
        const hasMultilineContent = checkForMultilineContent(csvData)
        if (hasMultilineContent) {
          setProgress(`✅ Multiline content detected and supported. Validation complete: ${valid_rows}/${total_rows} rows valid`)
        }

        if (errors.length > 0) {
          setError(`Validation errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
        }

        return result.validation_result
      } else {
        setError(result.error || 'Validation failed')
        return null
      }
    } catch (error: any) {
      setError(error.message || 'Validation failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    try {
      setLoading(true)
      setError('')
      setProgress('Starting import...')

      let result
      
      if (format === 'csv') {
        if (!csvData) {
          setError('Please select a CSV file')
          return
        }
        
        setProgress('Validating CSV...')
        const validation = await validateCSV()
        if (!validation) return
        
        setProgress('Importing data...')
        result = await ArtworksAPI.uploadCSV(csvData, platform as any, driveFolderUrl || undefined, { 
          brand_code: selectedBrand,
          auction_id: selectedAuction
        })
        
      } else if (format === 'spreadsheet') {
        if (!googleSheetUrl) {
          setError('Please configure Google Sheets URL')
          return
        }
        
        setProgress('Syncing from Google Sheets...')
        result = await syncArtworksFromGoogleSheet(googleSheetUrl, selectedBrand, platform, driveFolderUrl || undefined, syncBackToSheets, selectedAuction)
      }

      if (result?.success) {
        const importedCount = (result as any).imported_count || (result as any).upserted || 0;
        let successMessage = `Import complete! ${importedCount} artworks imported.`;

        // Add sync-back results if applicable
        if (format === 'spreadsheet' && syncBackToSheets && (result as any).sync_back) {
          const syncBack = (result as any).sync_back;
          if (syncBack.success) {
            successMessage += ` ${syncBack.message}`;
          } else {
            successMessage += ` Warning: ${syncBack.message}`;
          }
        }

        // Add auction update results if applicable
        if ((result as any).auction_update) {
          const auctionUpdate = (result as any).auction_update;
          if (auctionUpdate.success) {
            successMessage += ` ${auctionUpdate.message}.`;
          } else {
            successMessage += ` Warning: ${auctionUpdate.message}`;
          }
        }

        setSuccess(successMessage)
        setTimeout(() => {
          onComplete?.(result)
        }, 2000)
      } else {
        setError(result?.error || 'Import failed')
      }

    } catch (error: any) {
      setError(error.message || 'Import failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      setError('')
      setProgress('Generating export...')

      if (format === 'csv') {
        await ArtworksAPI.exportCSV({
          platform: platform as any,
          ...(selectedItems.length > 0 && { item_ids: selectedItems }),
          brand_code: selectedBrand,
          include_all_fields: platform === 'database'
        })
        setSuccess('Export complete! File downloaded.')
        
      } else if (format === 'spreadsheet') {
        // Spreadsheet export - export to Google Sheets if configured
        if (!hasGoogleSheetConfig) {
          setError('Google Sheets not configured for this brand. Please configure Google Sheets URL first.')
          return
        }
        
        setProgress('Fetching artworks for Google Sheets export...')

        // For large exports, use the dedicated export endpoint instead of loading all items
        let artworksResponse;
        if (selectedItems.length > 0) {
          // For selected items, get them individually
          artworksResponse = await ArtworksAPI.getArtworks({
            item_ids: selectedItems,
            brand_code: selectedBrand as 'MSABER' | 'AURUM' | 'METSAB',
            sort_field: 'id',
            sort_direction: 'asc'
          });
        } else {
          // For all items, use a high limit to allow syncing all items
          artworksResponse = await ArtworksAPI.getArtworks({
            limit: 10000, // High limit for sync operations
            brand_code: selectedBrand as 'MSABER' | 'AURUM' | 'METSAB',
            sort_field: 'id',
            sort_direction: 'asc'
          });
        }

        if (!artworksResponse.success) {
          setError('Failed to fetch artworks for export')
          return
        }
        
        // Filter to selected items if any are selected, then sort by ID
        let artworksToExport = selectedItems.length > 0
          ? artworksResponse.data.filter(artwork => selectedItems.includes(artwork.id!))
          : artworksResponse.data

        // Sort by ID ascending to ensure consistent ordering
        artworksToExport = artworksToExport.sort((a, b) => {
          const idA = typeof a.id === 'string' ? parseInt(a.id) : (a.id || 0);
          const idB = typeof b.id === 'string' ? parseInt(b.id) : (b.id || 0);
          return idA - idB;
        })
        
        if (artworksToExport.length === 0) {
          setError('No artworks to export')
          return
        }
        
        setProgress('Syncing to Google Sheets...')
        
        // Use the sync to Google Sheets API
        const apiUrl = getApiBaseUrl()
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        
        const response = await fetch(`${apiUrl}/items/sync-to-google-sheet`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sheet_url: googleSheetUrl,
            artworks: artworksToExport,
            brand: selectedBrand
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSuccess(`Export complete! ${artworksToExport.length} artworks synced to Google Sheets.`)
        } else {
          setError(result.error || 'Failed to sync to Google Sheets. Check your configuration.')
        }
      }

    } catch (error: any) {
      setError(error.message || 'Export failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const downloadTemplate = async () => {
    try {
      await ArtworksAPI.downloadTemplate(platform as any)
    } catch (error: any) {
      setError('Failed to download template')
    }
  }

  const handlePreviewDriveMapping = async () => {
    if (!driveFolderUrl.trim()) {
      setError('Please enter a Google Drive folder URL')
      return
    }

    try {
      setPreviewLoading(true)
      setError('')
      const result = await ArtworksAPI.previewDriveMapping(driveFolderUrl)

      if (result.success && result.mapping_preview) {
        setPreviewData({
          mapping_preview: result.mapping_preview,
          total_files: result.total_files || 0,
          mapped_ids: result.mapped_ids || 0
        })
        setShowPreview(true)
      } else {
        setError(result.error || 'Failed to preview drive mapping')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to preview drive mapping')
    } finally {
      setPreviewLoading(false)
    }
  }

  const currentConfig = platformConfigs[platform]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {mode === 'import' ? 'Import Artworks' : 'Export Artworks'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`p-3 border rounded-lg text-left ${
                  format === 'csv' 
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FileText className="h-5 w-5 mb-2" />
                <div className="font-medium">CSV File</div>
                <div className="text-sm text-gray-500">Upload or download CSV files</div>
              </button>
              
              <button
                onClick={() => setFormat('spreadsheet')}
                className={`p-3 border rounded-lg text-left ${
                  format === 'spreadsheet' 
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Globe className="h-5 w-5 mb-2" />
                <div className="font-medium">Google Sheets</div>
                <div className="text-sm text-gray-500">Sync with Google Spreadsheets</div>
              </button>
            </div>
          </div>

          {/* Brand Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {(Array.isArray(brands) ? brands : []).map((brand) => (
                <option key={brand.id} value={brand.code}>
                  {brand.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Select the brand for {mode === 'import' ? 'importing' : 'exporting'} data</p>
          </div>

          {/* Auction Selection (Import only, optional) */}
          {mode === 'import' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auction (Optional)
              </label>
              <SearchableSelect<number>
                value={selectedAuction}
                options={auctionOptions}
                placeholder="Select an auction (optional)"
                onChange={(value) => setSelectedAuction(value)}
                isLoading={auctionsLoading}
                inputPlaceholder="Search auctions..."
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                If selected, imported items will be automatically added to this auction
              </p>
            </div>
          )}

          {/* Platform Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {(platformConfigs && typeof platformConfigs === 'object' ? Object.entries(platformConfigs) : []).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">{currentConfig.description}</p>
          </div>

          {/* Platform Details */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Platform Details</h4>
            <div className="text-xs text-gray-600">
              <div><strong>Required fields:</strong> {currentConfig.requiredFields.join(', ')}</div>
              <div className="mt-1"><strong>Total fields:</strong> {currentConfig.csvHeaders.length}</div>
              <div className="mt-1 flex items-center">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <strong>✅ Multiline text supported:</strong> Titles and descriptions with line breaks are properly handled
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className="mt-2 text-xs text-teal-600 hover:text-teal-700 underline"
            >
              Download {currentConfig.label} Template
            </button>
            {/* Drive folder mapping for images - only show for import */}
            {mode === 'import' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Folder URL (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handlePreviewDriveMapping}
                    disabled={previewLoading || !driveFolderUrl.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                  >
                    {previewLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-1"></div>
                        Loading...
                      </div>
                    ) : (
                      'Preview'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">If provided, images will be mapped by item id (e.g., files starting with 12*, 12-A, 12 (A), 12-1, 12 (1) map to item id 12).</p>
              </div>
            )}
          </div>

          {/* CSV File Upload */}
          {mode === 'import' && format === 'csv' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              {csvFile && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs">Multiline titles and descriptions are fully supported</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Sheets Configuration */}
          {format === 'spreadsheet' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Google Sheets URL
                </label>
                <button
                  onClick={() => setShowUrlConfig(!showUrlConfig)}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  {hasGoogleSheetConfig ? 'Change URL' : 'Configure URL'}
                </button>
              </div>
              
              {hasGoogleSheetConfig ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-800">Google Sheets URL configured</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm text-yellow-800">No Google Sheets URL configured for artworks</span>
                  </div>
                </div>
              )}

              {showUrlConfig && (
                <div className="mt-3 p-3 border border-gray-200 rounded-md">
                  <input
                    type="url"
                    value={editingUrl}
                    onChange={(e) => setEditingUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveGoogleSheetConfig}
                      className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                    >
                      Save URL
                    </button>
                    <button
                      onClick={() => setShowUrlConfig(false)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Sync Back Option */}
              {hasGoogleSheetConfig && driveFolderUrl && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="syncBack"
                      checked={syncBackToSheets}
                      onChange={(e) => setSyncBackToSheets(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="syncBack" className="text-sm text-blue-800">
                      <strong>Sync back to Google Sheets:</strong> After importing and mapping images, write the complete updated data back to Google Sheets
                    </label>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    This ensures your Google Sheet stays updated with the latest image URLs and data from the database.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Export Options */}
          {mode === 'export' && selectedItems.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                Exporting {selectedItems.length} selected artwork(s)
              </p>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-green-800">{success}</span>
              </div>
            </div>
          )}

          {progress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">{progress}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={mode === 'import' ? handleImport : handleExport}
              disabled={loading || (mode === 'import' && format === 'csv' && !csvData) || (format === 'spreadsheet' && !hasGoogleSheetConfig)}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {mode === 'import' ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 inline" />
                      Import
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2 inline" />
                      Export
                    </>
                  )}
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Looking for a public submission link? Share our <a href="/inventory-form" target="_blank" rel="noopener noreferrer" className="underline text-teal-700">Inventory Form</a> with your clients.
          </div>
        </div>
      </div>

      {/* Drive Mapping Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-1 overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Drive Mapping Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{previewData.total_files}</div>
                    <div className="text-sm text-gray-600">Total Files</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{previewData.mapped_ids}</div>
                    <div className="text-sm text-gray-600">Mapped IDs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">{Object.values(previewData.mapping_preview).reduce((sum, item) => sum + item.count, 0)}</div>
                    <div className="text-sm text-gray-600">Total Images Mapped</div>
                  </div>
                </div>
              </div>

              {/* Mapping Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-lg">Image Mapping Details</h4>
                {Object.entries(previewData.mapping_preview).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No images could be mapped to item IDs. Please check your folder and filename format.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {(previewData.mapping_preview && typeof previewData.mapping_preview === 'object' ? Object.entries(previewData.mapping_preview) : []).map(([itemId, mapping]) => (
                      <div key={itemId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-lg">Item ID: {itemId}</h5>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            {mapping.count} image{mapping.count !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(mapping.images && Array.isArray(mapping.images) ? mapping.images : []).map((image, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-2">
                              <div className="aspect-square mb-2 overflow-hidden bg-gray-100 rounded relative">
                                <img
                                  src={image.url}
                                  alt={image.filename}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    const fileId = image.fileId;

                                    // Try multiple Google Drive URL formats as fallbacks
                                    if (!img.dataset.triedFallback1) {
                                      img.dataset.triedFallback1 = 'true';
                                      img.src = `https://drive.google.com/uc?id=${fileId}&export=download`;
                                      return;
                                    }

                                    if (!img.dataset.triedFallback2) {
                                      img.dataset.triedFallback2 = 'true';
                                      img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=s400`;
                                      return;
                                    }

                                    if (!img.dataset.triedFallback3) {
                                      img.dataset.triedFallback3 = 'true';
                                      img.src = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
                                      return;
                                    }

                                    // If all Google Drive URLs fail, show local placeholder SVG
                                    if (!img.dataset.triedPlaceholder) {
                                      img.dataset.triedPlaceholder = 'true';
                                      img.src = '/placeholder-image.svg';
                                      return;
                                    }
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-600 truncate" title={image.filename}>
                                {image.filename}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowPreview(false)
                  // Could auto-populate the import form or provide next steps
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Proceed with Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
