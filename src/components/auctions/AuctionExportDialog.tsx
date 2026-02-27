// frontend/src/components/auctions/AuctionExportDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Search, Globe, AlertCircle, CheckCircle, Filter, FileText, Image as ImageIcon, Package } from 'lucide-react'
import { getAuctions, exportAuctionToPlatform, exportAuctionImagesToPlatform } from '@/lib/auctions-api'
import { ArtworksAPI } from '@/lib/items-api'
import type { Auction } from '@/lib/auctions-api'

interface AuctionExportDialogProps {
  onClose: () => void
  selectedAuctions?: number[]
}

type Platform = 'database' | 'liveauctioneers' | 'easy_live' | 'the_saleroom' | 'invaluable'

interface Artwork {
  id: number
  lot_num: string
  title: string
  description: string
  artist_maker: string
  images?: string[] // Unlimited images array
  status: string
  auction_name?: string
}

interface PlatformConfig {
  label: string
  description: string
  csvHeaders: string[]
  requiredFields: string[]
}

// Using the same platform configs as the items export for artwork data
const platformConfigs: Record<Platform, PlatformConfig> = {
  database: {
    label: 'Our Database',
    description: 'Full format with all available artwork fields',
    csvHeaders: [
      'id', 'lot_num', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'reserve', 'consignment_id',
      'status', 'category', 'subcategory', 'dimensions', 'weight', 'materials', 'artist_maker', 'period_age', 'provenance', 'auction_id',
      'artist_id', 'school_id', 'dimensions_inches', 'dimensions_cm', 'dimensions_with_frame_inches', 'dimensions_with_frame_cm',
      'condition_report', 'gallery_certification', 'gallery_id', 'artist_certification', 'certified_artist_id', 'artist_family_certification',
      'restoration_done', 'restoration_by', 'images', 'created_at', 'updated_at'
    ],
    requiredFields: ['lot_num', 'title', 'description', 'low_est', 'high_est']
  },
  liveauctioneers: {
    label: 'LiveAuctioneers',
    description: 'Compatible with LiveAuctioneers artwork CSV format',
    csvHeaders: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst', 'StartPrice', 'ReservePrice', 'Buy Now Price', 'Exclude From Buy Now', 'Condition', 'Category', 'Origin', 'Style & Period', 'Creator', 'Materials & Techniques', 'Reserve Price', 'Domestic Flat Shipping Price', 'Height', 'Width', 'Depth', 'Dimension Unit', 'Weight', 'Weight Unit', 'Quantity'],
    requiredFields: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst']
  },
  easy_live: {
    label: 'Easy Live Auction',
    description: 'Compatible with Easy Live Auction artwork CSV format',
    csvHeaders: ['LotNo', 'Description', 'Condition Report', 'LowEst', 'HighEst', 'Category'],
    requiredFields: ['LotNo', 'Description', 'LowEst', 'HighEst']
  },
  the_saleroom: {
    label: 'The Saleroom',
    description: 'Compatible with The Saleroom artwork CSV format',
    csvHeaders: ['Number', 'Title', 'Description', 'Hammer', 'Reserve', 'StartPrice', 'Increment', 'Quantity', 'LowEstimate', 'HighEstimate', 'CategoryCode', 'Sales Tax/VAT', 'BuyersPremiumRate', 'BuyersPremiumCeiling', 'InternetSurchargeRate', 'InternetSurchargeCeiling', 'BuyersPremiumVatRate', 'InternetSurchargeVatRate', 'End Date', 'End Time', 'Lot Link', 'Main Image', 'ExtraImages', 'BuyItNowPrice', 'IsBulk', 'Artist\'s Resale Right Applies', 'Address1', 'Address2', 'Address3', 'Address4', 'Postcode', 'TownCity', 'CountyState', 'CountryCode', 'ShippingInfo'],
    requiredFields: ['Number', 'Title', 'Description', 'LowEstimate', 'HighEstimate']
  },
  invaluable: {
    label: 'Invaluable',
    description: 'Compatible with Invaluable artwork CSV format',
    csvHeaders: ['lot_num', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'category', 'dimensions'],
    requiredFields: ['lot_num', 'title', 'description', 'low_est', 'high_est']
  }
}

export default function AuctionExportDialog({
  onClose,
  selectedAuctions = []
}: AuctionExportDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['database'])
  const [loading, setLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Export options
  const [exportCSV, setExportCSV] = useState(true)
  const [exportImages, setExportImages] = useState(false)

  // Auction selection state
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAuctionIds, setSelectedAuctionIds] = useState<number[]>(selectedAuctions)
  const [showAuctionList, setShowAuctionList] = useState(true)
  const [auctionsLoading, setAuctionsLoading] = useState(true)

  // Artwork selection state
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<number[]>([])
  const [artworksLoading, setArtworksLoading] = useState(false)
  const [showArtworkList, setShowArtworkList] = useState(false)

  // Lot specification state
  const [lotSpecification, setLotSpecification] = useState('')
  const [useLotSpecification, setUseLotSpecification] = useState(false)


  // Parse lot specification string like "1-10,15-20,25,30-35" into array of lot numbers
  const parseLotSpecification = (spec: string): number[] => {
    if (!spec.trim()) return []

    // Handle special "all" keyword
    if (spec.trim().toLowerCase() === 'all') {
      // Return all possible lot numbers from selected auctions
      const allLots: number[] = []
      for (const auctionId of selectedAuctionIds) {
        const auction = auctions.find(a => a.id === auctionId)
        if (auction?.artwork_ids && Array.isArray(auction.artwork_ids)) {
          for (let i = 1; i <= auction.artwork_ids.length; i++) {
            allLots.push(i)
          }
        }
      }
      return [...new Set(allLots)].sort((a, b) => a - b)
    }

    const lots: number[] = []
    const parts = spec.split(',').map(p => p.trim())

    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range like "1-10"
        const [start, end] = part.split('-').map(s => parseInt(s.trim()))
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            lots.push(i)
          }
        }
      } else {
        // Handle single lot like "25"
        const lot = parseInt(part)
        if (!isNaN(lot)) {
          lots.push(lot)
        }
      }
    }

    // Remove duplicates and sort
    return [...new Set(lots)].sort((a, b) => a - b)
  }

  // Convert lot numbers to item IDs based on auction's artwork_ids array
  const convertLotsToItemIds = (auctionId: number, lotNumbers: number[]): number[] => {
    const auction = auctions.find(a => a.id === auctionId)
    if (!auction?.artwork_ids || !Array.isArray(auction.artwork_ids)) return []

    const itemIds: number[] = []
    for (const lotNum of lotNumbers) {
      // Lot numbers are 1-based, array indices are 0-based
      const arrayIndex = lotNum - 1
      if (arrayIndex >= 0 && arrayIndex < auction.artwork_ids.length) {
        itemIds.push(auction.artwork_ids[arrayIndex])
      }
    }

    return itemIds
  }

  // Get filtered artworks based on lot specification
  const getFilteredArtworks = (): Artwork[] => {
    if (!useLotSpecification || !lotSpecification.trim()) {
      return artworks
    }

    const allLotNumbers = parseLotSpecification(lotSpecification)
    if (allLotNumbers.length === 0) return []

    // Get item IDs for all selected auctions
    const filteredItemIds: number[] = []
    for (const auctionId of selectedAuctionIds) {
      const itemIds = convertLotsToItemIds(auctionId, allLotNumbers)
      filteredItemIds.push(...itemIds)
    }

    // Filter artworks based on item IDs
    return artworks.filter(artwork => filteredItemIds.includes(artwork.id))
  }

  // Load auctions on component mount
  useEffect(() => {
    loadAuctions()
  }, [])

  const loadAuctions = async () => {
    try {
      setAuctionsLoading(true)
      const response = await getAuctions({
        page: 1,
        limit: 100,
        sort_field: 'created_at',
        sort_direction: 'desc'
      })
      setAuctions(response.auctions)
    } catch (err) {
      console.error('Error loading auctions:', err)
      setError('Failed to load auctions')
    } finally {
      setAuctionsLoading(false)
    }
  }

  const loadArtworksFromSelectedAuctions = async () => {
    if (selectedAuctionIds.length === 0) {
      setArtworks([])
      return
    }

    try {
      setArtworksLoading(true)
      const allArtworks: Artwork[] = []

      // Load artworks from each selected auction
      for (const auctionId of selectedAuctionIds) {
        try {
          const response = await fetch(`/api/auctions/${auctionId}/artworks`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            if (data.artworks && Array.isArray(data.artworks)) {
              // Add lot numbers based on position in auction
              const artworksWithLotNumbers = data.artworks.map((artwork: any, index: number) => ({
                ...artwork,
                lot_num: (index + 1).toString(),
                auction_name: data.auction.short_name || data.auction.long_name
              }))
              allArtworks.push(...artworksWithLotNumbers)
            }
          }
        } catch (err) {
          console.error(`Error loading artworks for auction ${auctionId}:`, err)
        }
      }

      setArtworks(allArtworks)
      // Auto-select all artworks by default
      setSelectedArtworkIds(allArtworks.map(artwork => artwork.id))
    } catch (err) {
      console.error('Error loading artworks:', err)
      setError('Failed to load artworks')
    } finally {
      setArtworksLoading(false)
    }
  }

  // Filter auctions based on search
  const filteredAuctions = auctions.filter(auction => 
    auction.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auction.long_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auction.id.toString().includes(searchTerm)
  )

  // Handle auction selection
  const toggleAuctionSelection = (auctionId: number) => {
    setSelectedAuctionIds(prev => 
      prev.includes(auctionId) 
        ? prev.filter(id => id !== auctionId)
        : [...prev, auctionId]
    )
  }

  const selectAllAuctions = () => {
    setSelectedAuctionIds(filteredAuctions.map(a => a.id))
  }

  const clearSelection = () => {
    setSelectedAuctionIds([])
  }

  // Platform selection functions
  const togglePlatformSelection = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const selectAllPlatforms = () => {
    setSelectedPlatforms(Object.keys(platformConfigs) as Platform[])
  }

  const clearPlatformSelection = () => {
    setSelectedPlatforms([])
  }

  // Artwork selection functions
  const toggleArtworkSelection = (artworkId: number) => {
    setSelectedArtworkIds(prev =>
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  const selectAllArtworks = () => {
    setSelectedArtworkIds(artworks.map(artwork => artwork.id))
  }

  const clearArtworkSelection = () => {
    setSelectedArtworkIds([])
  }

  // Effect to load artworks when auction selection changes
  useEffect(() => {
    if (selectedAuctionIds.length > 0) {
      loadArtworksFromSelectedAuctions()
      setShowArtworkList(true)
    } else {
      setArtworks([])
      setSelectedArtworkIds([])
      setShowArtworkList(false)
    }
  }, [selectedAuctionIds])

  const handleExport = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      setExportProgress('')

      if (selectedAuctionIds.length === 0) {
        setError('Please select at least one auction to export')
        return
      }

      if (selectedPlatforms.length === 0) {
        setError('Please select at least one platform to export to')
        return
      }

      // Get the artworks to export based on selection method
      const artworksToExport = useLotSpecification ? getFilteredArtworks() : artworks.filter(artwork => selectedArtworkIds.includes(artwork.id))

      if (artworksToExport.length === 0) {
        setError('Please select at least one artwork to export')
        return
      }

      if (!exportCSV && !exportImages) {
        setError('Please select at least one export option (CSV or Images)')
        return
      }

      console.log(`Exporting ${artworksToExport.length} artworks to ${selectedPlatforms.length} platforms`)
      let totalExports = 0
      let completedExports = 0

      // Calculate total exports needed
      if (exportCSV) totalExports += selectedPlatforms.length
      if (exportImages) totalExports += selectedPlatforms.length * selectedAuctionIds.length

      // Export CSV for each selected platform
      if (exportCSV) {
        for (const platform of selectedPlatforms) {
          setExportProgress(`Generating CSV file for ${artworksToExport.length} artworks to ${platformConfigs[platform].label}...`)
          try {
            // Pass filtered item IDs to the export function
            await exportAuctionToPlatform(selectedAuctionIds[0].toString(), platform as any, artworksToExport.map(a => a.id))
            completedExports++
            setExportProgress(`CSV exported to ${platformConfigs[platform].label} (${artworksToExport.length} artworks, ${completedExports}/${totalExports})`)
          } catch (csvError) {
            console.error(`CSV export error for ${platform}:`, csvError)
            const errorMessage = csvError instanceof Error ? csvError.message : 'Unknown error'
            setError(`CSV export failed for ${platformConfigs[platform].label}: ${errorMessage}`)
            return
          }
        }
      }

      // Export images for each auction and platform combination
      if (exportImages) {
        for (const auctionId of selectedAuctionIds) {
          const auction = auctions.find(a => a.id === auctionId)
          const auctionArtworks = artworksToExport.filter(artwork => artwork.auction_name === (auction?.short_name || auction?.long_name))

          for (const platform of selectedPlatforms) {
            setExportProgress(`Processing ${auctionArtworks.length} lots for "${auction?.short_name || `Auction ${auctionId}`}" to ${platformConfigs[platform].label}...`)

            try {
              // Pass filtered item IDs to the export function
              await exportAuctionImagesToPlatform(auctionId.toString(), platform as any, auctionArtworks.map(a => a.id))
              completedExports++
              setExportProgress(`Images exported for "${auction?.short_name || `Auction ${auctionId}`}" to ${platformConfigs[platform].label} (${auctionArtworks.length} lots processed, ${completedExports}/${totalExports})`)
            } catch (imageError) {
              console.error(`Image export error for ${platform}:`, imageError)
              const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown error'
              setError(`Image export failed for "${auction?.short_name || `Auction ${auctionId}`}" to ${platformConfigs[platform].label}: ${errorMessage}`)
              return
            }
          }
        }
      }

      const platformNames = selectedPlatforms.map(p => platformConfigs[p].label).join(', ')
      setSuccess(`Successfully exported ${artworksToExport.length} artworks from ${selectedAuctionIds.length} auction(s) to ${platformNames}`)

      setTimeout(() => {
        onClose()
      }, 3000)

    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export artworks')
    } finally {
      setLoading(false)
      setExportProgress('')
    }
  }

  // Get the first selected platform for display purposes
  const firstSelectedPlatform = selectedPlatforms.length > 0 ? selectedPlatforms[0] : 'database'
  const config = platformConfigs[firstSelectedPlatform]

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Export Auction Artworks
            {(exportCSV || exportImages) && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({exportCSV && 'CSV'} {exportCSV && exportImages && '+ '}{exportImages && 'Images'})
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Select auctions, choose specific artworks, and export to multiple platforms simultaneously.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Select multiple auctions to combine their artworks</p>
            <p>• Choose specific artworks from selected auctions</p>
            <p>• Export to multiple platforms at once</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Auction Selection */}
        {showAuctionList && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Auctions:
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllAuctions}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  disabled={auctionsLoading}
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-gray-600 hover:text-gray-700"
                  disabled={auctionsLoading}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search auctions..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg"
                disabled={auctionsLoading}
              />
            </div>

            {/* Auction List */}
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {auctionsLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <span className="text-sm text-gray-600">Loading auctions...</span>
                </div>
              ) : filteredAuctions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No auctions match your search' : 'No auctions found'}
                </div>
              ) : (
                filteredAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedAuctionIds.includes(auction.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => toggleAuctionSelection(auction.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAuctionIds.includes(auction.id)}
                        onChange={() => toggleAuctionSelection(auction.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{auction.short_name || auction.long_name}</div>
                        <div className="text-xs text-gray-500">
                          ID: {auction.id} • {auction.type} • {auction.upload_status} • {auction.artwork_ids?.length || 0} lots
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedAuctionIds.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                {selectedAuctionIds.length} auction(s) selected
              </div>
            )}
          </div>
        )}

        {/* Artwork Selection */}
        {showArtworkList && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Artworks ({artworks.length} available):
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllArtworks}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  disabled={artworksLoading}
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearArtworkSelection}
                  className="text-xs text-gray-600 hover:text-gray-700"
                  disabled={artworksLoading}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {artworksLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <span className="text-sm text-gray-600">Loading artworks...</span>
                </div>
              ) : artworks.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No artworks found in selected auctions
                </div>
              ) : (
                artworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedArtworkIds.includes(artwork.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => toggleArtworkSelection(artwork.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedArtworkIds.includes(artwork.id)}
                        onChange={() => toggleArtworkSelection(artwork.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Lot {artwork.lot_num}: {artwork.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {artwork.auction_name} • {artwork.artist_maker} • ID: {artwork.id}
                        </div>
                      </div>
                      {artwork.images && artwork.images.length > 0 && (
                        <ImageIcon className="h-4 w-4 text-green-600 ml-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedArtworkIds.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                {selectedArtworkIds.length} artwork(s) selected
              </div>
            )}
          </div>
        )}

        {/* Lot Specification */}
        {showArtworkList && selectedAuctionIds.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Lot Specification (Optional):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use-lot-spec"
                  checked={useLotSpecification}
                  onChange={(e) => setUseLotSpecification(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="use-lot-spec" className="text-xs text-gray-600">
                  Use lot specification instead of manual selection
                </label>
              </div>
            </div>

            {useLotSpecification && (
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={lotSpecification}
                    onChange={(e) => setLotSpecification(e.target.value)}
                    placeholder="e.g., 1-10,15-20,25,30-35 or 'all' for all lots"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter lot ranges (e.g., 1-10) or individual lots (e.g., 5,8,12) separated by commas.
                    Use 'all' to export all lots from selected auctions.
                  </p>
                </div>

                {lotSpecification && useLotSpecification && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <strong>Parsed lots:</strong> {parseLotSpecification(lotSpecification).join(', ') || 'None'}
                      {(() => {
                        const filtered = getFilteredArtworks()
                        return filtered.length > 0 ? (
                          <span className="block mt-1">
                            <strong>Matching artworks:</strong> {filtered.length} item(s) found
                          </span>
                        ) : null
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Export Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Export Options:
          </label>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="export-csv"
                checked={exportCSV}
                onChange={(e) => setExportCSV(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="export-csv" className="flex items-center space-x-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Export CSV File</span>
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="export-images"
                checked={exportImages}
                onChange={(e) => setExportImages(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="export-images" className="flex items-center space-x-2 text-sm">
                <Package className="h-4 w-4 text-green-600" />
                <span>Export Images ZIP</span>
              </label>
            </div>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Export Platforms:
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAllPlatforms}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearPlatformSelection}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(platformConfigs).map(([platform, config]) => (
              <div
                key={platform}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedPlatforms.includes(platform as Platform)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => togglePlatformSelection(platform as Platform)}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform as Platform)}
                    onChange={() => togglePlatformSelection(platform as Platform)}
                    className="mr-2"
                  />
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">{config.label}</span>
                </div>
                <p className="text-xs text-gray-600">{config.description}</p>
              </div>
            ))}
          </div>
          {selectedPlatforms.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
              {selectedPlatforms.length} platform(s) selected: {selectedPlatforms.map(p => platformConfigs[p].label).join(', ')}
            </div>
          )}
        </div>

        {/* Platform Details */}
        {selectedPlatforms.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">
              Export Details for Selected Platforms ({selectedPlatforms.length}):
            </h4>
            <div className="space-y-3">
              {selectedPlatforms.map(platform => {
                const platformConfig = platformConfigs[platform]
                return (
                  <div key={platform} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                    <h5 className="font-medium text-sm text-blue-700 mb-1">{platformConfig.label}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium text-gray-700 mb-1">CSV Headers:</p>
                        <p className="text-gray-600">{platformConfig.csvHeaders.slice(0, 5).join(', ')}...</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Required Fields:</p>
                        <p className="text-gray-600">{platformConfig.requiredFields.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {loading && exportProgress && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-blue-800 text-sm font-medium">{exportProgress}</span>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-800 text-sm">{success}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={loading || selectedAuctionIds.length === 0 || selectedPlatforms.length === 0 || selectedArtworkIds.length === 0 || (!exportCSV && !exportImages)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {exportProgress || 'Exporting...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {exportCSV && 'CSV'} {exportCSV && exportImages && '+ '}{exportImages && 'Images'} to {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
