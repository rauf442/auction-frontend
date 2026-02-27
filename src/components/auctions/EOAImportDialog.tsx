// frontend/src/components/auctions/EOAImportDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Upload, Link, Download } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { getBrands, type Brand } from '@/lib/brands-api'
import { importEOA, getAuction, type Auction } from '@/lib/auctions-api'

interface EOAImportDialogProps {
  auctionId: number
  onClose: () => void
  onImportComplete: (importedCount: number) => void
}

const PLATFORMS = [
  'LiveAuctioneers',
  'The Saleroom', 
  'Invaluable',
  'Easylive Auctions'
] as const

type Platform = typeof PLATFORMS[number]

export default function EOAImportDialog({
  auctionId,
  onClose,
  onImportComplete
}: EOAImportDialogProps) {
  const { brand: currentBrand } = useBrand()

  const [importType, setImportType] = useState<'csv' | 'sheets'>('csv')
  const [platform, setPlatform] = useState<Platform>('LiveAuctioneers')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auctionData, setAuctionData] = useState<Auction | null>(null)
  const [loadingAuction, setLoadingAuction] = useState(false)

  useEffect(() => {
    loadBrands()
    loadAuctionData()
  }, [auctionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set initial brand when brands are loaded
  useEffect(() => {
    if (brands.length > 0 && !selectedBrand && currentBrand) {
      console.log('EOA Debug - Setting initial brand from current context:', currentBrand)
      const brand = brands.find(b => b.code === currentBrand)
      if (brand) {
        setSelectedBrand(brand.id.toString())
      } else if (brands.length > 0) {
        // Fallback to first available brand if current brand not found
        console.log('EOA Debug - Current brand not found, using first available brand')
        setSelectedBrand(brands[0].id.toString())
      }
    }
  }, [brands, currentBrand, selectedBrand])

  useEffect(() => {
    // Pre-fill platform and brand from auction data
    if (auctionData && brands.length > 0) {
      console.log('EOA Debug - Auction data:', auctionData)
      console.log('EOA Debug - Available brands:', brands)
      console.log('EOA Debug - Current brand:', currentBrand)

      // Pre-fill platform based on auction data
      if (auctionData.platform) {
        const mappedPlatform = mapAuctionPlatformToDialog(auctionData.platform)
        if (mappedPlatform) {
          console.log('EOA Debug - Setting platform to:', mappedPlatform)
          setPlatform(mappedPlatform)
        }
      }

      // Pre-fill brand based on auction data
      let selectedBrandFound = false

      // Try to match by brand_id first (if available)
      if (auctionData.brand_id) {
        console.log('EOA Debug - Looking for brand_id:', auctionData.brand_id)
        const brand = brands.find(b => b.id === auctionData.brand_id)
        if (brand) {
          console.log('EOA Debug - Found brand by code:', brand)
          setSelectedBrand(brand.id.toString())
          selectedBrandFound = true
        }
      }

      // If no brand_code match, try to match by brand_id
      if (!selectedBrandFound && auctionData.brand_id) {
        console.log('EOA Debug - Looking for brand_id:', auctionData.brand_id)
        const brand = brands.find(b => b.id === auctionData.brand_id)
        if (brand) {
          console.log('EOA Debug - Found brand by id:', brand)
          setSelectedBrand(brand.id.toString())
          selectedBrandFound = true
        }
      }

      // Fallback to current brand if no auction brand found and no brand is currently selected
      if (!selectedBrandFound && !selectedBrand && currentBrand && brands.length > 0) {
        console.log('EOA Debug - Using current brand as fallback:', currentBrand)
        const brand = brands.find(b => b.code === currentBrand)
        if (brand) {
          console.log('EOA Debug - Found current brand:', brand)
          setSelectedBrand(brand.id.toString())
        }
      }

      if (!selectedBrandFound) {
        console.log('EOA Debug - No brand selected, available options:')
        brands.forEach(b => console.log(`  - ${b.code} (id: ${b.id})`))
      }
    }
  }, [auctionData, brands, currentBrand])

  const loadBrands = async () => {
    try {
      const response = await getBrands()
      if (response.success) {
        setBrands(response.data)
      } else {
        console.error('Error loading brands:', response.message)
        setError(response.message || 'Failed to load brands')
      }
    } catch (err: any) {
      console.error('Error loading brands:', err)
      setError(err.message || 'Failed to load brands')
    }
  }

  const loadAuctionData = async () => {
    try {
      setLoadingAuction(true)
      const auction = await getAuction(auctionId.toString())
      setAuctionData(auction)
    } catch (err: any) {
      console.error('Error loading auction data:', err)
      setError('Failed to load auction data')
    } finally {
      setLoadingAuction(false)
    }
  }

  const mapAuctionPlatformToDialog = (auctionPlatform: string): Platform | null => {
    // Map auction platform values to dialog platform options
    const platformMapping: Record<string, Platform> = {
      'liveauctioneers': 'LiveAuctioneers',
      'live_auctioneers': 'LiveAuctioneers',
      'live auctioneers': 'LiveAuctioneers',
      'the_saleroom': 'The Saleroom',
      'the saleroom': 'The Saleroom',
      'saleroom': 'The Saleroom',
      'invaluable': 'Invaluable',
      'easylive': 'Easylive Auctions',
      'easy_live': 'Easylive Auctions',
      'easy live': 'Easylive Auctions'
    }

    return platformMapping[auctionPlatform.toLowerCase()] || null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setCsvFile(file)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!selectedBrand) {
      setError('Please select a brand')
      return
    }

    if (importType === 'csv' && !csvFile) {
      setError('Please select a CSV file')
      return
    }

    if (importType === 'sheets' && !sheetsUrl) {
      setError('Please provide a Google Sheets URL')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('auction_id', auctionId.toString())
      formData.append('platform', platform)
      formData.append('brand_id', selectedBrand)
      formData.append('import_type', importType)

      if (importType === 'csv' && csvFile) {
        formData.append('csv_file', csvFile)
      } else if (importType === 'sheets') {
        formData.append('sheets_url', sheetsUrl)
      }

      const result = await importEOA(formData)
      
      if (result.success) {
        onImportComplete(result.data.imported_count || 0)
        onClose()
      } else {
        setError(result.message || 'Import failed')
      }
    } catch (err: any) {
      console.error('Error importing EOA:', err)
      setError(err.message || 'Failed to import EOA data')
    } finally {
      setUploading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      'Lot Number,Lot ID,Title,Sale Price,Buyer Premium,First Name,Last Name,Username,Email,Account phone,Shipping Method,Shipping Status,"Ship to, Phone","Ship to, Name","Ship to, Surname",Company,Address,City,State,Country,Postal Code,Paddle Number,Premium Bidder,Lot Reference Number,Listing Agent ID,Listing Agent,Commission Rate,Hammer,Commission,Processing Fee (3% of Hammer),Sales Tax,Net to Pay Listing Agent,Domestic Flat Shipping,Paid',
      '0019,209274753,NICHOLAS ROERICH (1874-1947) TEMPERA ON JUTE,"£3,000.00",£900.00,Darren,Aronofsky,dorothysdog,nathanbuttle@gmail.com,19179927533,In-House,n,7183885425,Darren,Aronofsky,,86 Forsyth St 2nd floor,New York,NY,US,10002-5101,903,yes,,,,,,,,,,,',
      '0035,209274776,INDIAN MINIATURE PAINTING BAIRADI RAGINI UDAIPUR SCHOOL DEPICTING A SPECIAL MUSICAL SCENE,£80.00,£24.00,Charles,Taylor,cdt411,cdt411@aol.com,18058953054,In-House,n,8058953054,Charles,Taylor,,12107 Charnock Rd,Los Angeles,CA,US,90066-3101,904,no,,,,,,,,,,,'
    ].join('\n')

    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'eoa_sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import EOA Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Auction Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">Auction Details</h3>
                {loadingAuction ? (
                  <div className="flex items-center mt-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Loading auction data...</span>
                  </div>
                ) : auctionData ? (
                  <div className="mt-1">
                    <p className="text-sm text-blue-800 font-medium">{auctionData.long_name}</p>
                    <p className="text-xs text-blue-600">ID: {auctionData.id} • Platform: {auctionData.platform || 'Not set'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700 mt-1">Auction ID: {auctionId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Import Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importType"
                  value="csv"
                  checked={importType === 'csv'}
                  onChange={(e) => setImportType('csv')}
                  className="mr-2"
                />
                CSV File Upload
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importType"
                  value="sheets"
                  checked={importType === 'sheets'}
                  onChange={(e) => setImportType('sheets')}
                  className="mr-2"
                />
                Google Sheets URL
              </label>
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Brand Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id.toString()}>
                  {brand.name} ({brand.code})
                </option>
              ))}
            </select>
          </div>

          {/* CSV File Upload */}
          {importType === 'csv' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Drop your CSV file here, or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                  {csvFile && (
                    <p className="text-sm text-green-600">
                      Selected: {csvFile.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <button
                  onClick={downloadSampleCSV}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Sample CSV Format
                </button>
              </div>
            </div>
          )}

          {/* Google Sheets URL */}
          {importType === 'sheets' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheets URL
              </label>
              <div className="flex">
                <Link className="h-10 w-10 text-gray-400 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 flex items-center justify-center" />
                <input
                  type="url"
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Make sure the Google Sheet is publicly accessible or shared with the appropriate permissions.
              </p>
            </div>
          )}

          {/* CSV Format Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Expected CSV Format</h4>
            <p className="text-xs text-blue-700 mb-2">
              The CSV should contain the following columns for {platform}:
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <div>• Lot Number, Lot ID, Title, Sale Price, Buyer Premium</div>
              <div>• Buyer Info: First Name, Last Name, Username, Email, Phone</div>
              <div>• Shipping: Method, Status, Ship-to details (Name, Address, etc.)</div>
              <div>• Payment: Paddle Number, Commission, Processing Fee, Sales Tax</div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={uploading || (!csvFile && importType === 'csv') || (!sheetsUrl && importType === 'sheets') || !selectedBrand}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Importing...' : 'Import EOA Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
