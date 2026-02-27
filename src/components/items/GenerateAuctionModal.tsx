// frontend/src/components/items/GenerateAuctionModal.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Trophy, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getAuctions, isAuctionPast } from '@/lib/auctions-api'

interface GenerateAuctionModalProps {
  onClose: () => void
  selectedArtworks: string[]
  onComplete?: (auctionId: string) => void
}

interface Brand {
  id: number
  code: string
  name: string
  is_active: boolean
}

export default function GenerateAuctionModal({
  onClose,
  selectedArtworks,
  onComplete
}: GenerateAuctionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [existingAuctions, setExistingAuctions] = useState<any[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(true)

  // Mode selection: 'new' or 'existing'
  const [mode, setMode] = useState<'new' | 'existing'>('existing')
  const [selectedAuction, setSelectedAuction] = useState<any>(null)

  // Form state for new auction
  const [auctionName, setAuctionName] = useState('')
  const [auctionDescription, setAuctionDescription] = useState('')
  const [auctionType, setAuctionType] = useState<'live' | 'timed' | 'sealed_bid'>('timed')
  const [settlementDate, setSettlementDate] = useState('')
  const [catalogueLaunchDate, setCatalogueLaunchDate] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')

  // Manual artwork ID input
  const [manualArtworkIds, setManualArtworkIds] = useState('')
  const [parsedArtworkIds, setParsedArtworkIds] = useState<string[]>([])
  const [artworkInputMode, setArtworkInputMode] = useState<'selected' | 'manual'>('selected')

  // Duplicate check state
  const [duplicateArtworks, setDuplicateArtworks] = useState<any[]>([])
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  // Parse artwork IDs from manual input
  const parseArtworkIds = (input: string): string[] => {
    if (!input.trim()) return []

    const ids: Set<string> = new Set()
    const parts = input.split(',').map(part => part.trim())

    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range (e.g., "1-20")
        const [start, end] = part.split('-').map(s => parseInt(s.trim()))
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            ids.add(i.toString())
          }
        }
      } else {
        // Handle individual ID
        const id = parseInt(part.trim())
        if (!isNaN(id) && id > 0) {
          ids.add(id.toString())
        }
      }
    }

    return Array.from(ids).sort((a, b) => parseInt(a) - parseInt(b))
  }

  // Update parsed IDs when manual input changes
  useEffect(() => {
    if (artworkInputMode === 'manual') {
      const parsed = parseArtworkIds(manualArtworkIds)
      setParsedArtworkIds(parsed)
    }
  }, [manualArtworkIds, artworkInputMode])

  // Re-check duplicates when artwork IDs change
  useEffect(() => {
    if (selectedAuction && getCurrentArtworkIds().length > 0) {
      checkForDuplicates(selectedAuction.id, getCurrentArtworkIds())
    }
  }, [selectedAuction, artworkInputMode, parsedArtworkIds, selectedArtworks])

  // Load brands and auctions on component mount
  useEffect(() => {
    loadBrands()
    loadExistingAuctions()
  }, [])

  const loadBrands = async () => {
    try {
      setBrandsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/brands`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load brands')
      }

      const data = await response.json()
      if (data.success && data.data) {
        const activeBrands = data.data.filter((brand: Brand) => brand.is_active)
        setBrands(activeBrands)
        // Set default brand to the first active brand
        if (activeBrands.length > 0) {
          setSelectedBrand(activeBrands[0].code)
        }
      }
    } catch (err) {
      console.error('Error loading brands:', err)
      setError('Failed to load brands')
    } finally {
      setBrandsLoading(false)
    }
  }

  const loadExistingAuctions = async () => {
    try {
      setAuctionsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auctions?limit=100`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load auctions')
      }

      const data = await response.json()
      if (data.auctions) {
        // Filter out past auctions (where today > settlementDate)
        const futureAuctions = data.auctions.filter((auction: any) => !isAuctionPast(auction))
        setExistingAuctions(futureAuctions)
      }
    } catch (err) {
      console.error('Error loading auctions:', err)
    } finally {
      setAuctionsLoading(false)
    }
  }

  const checkForDuplicates = async (auctionId: string, artworkIds: string[] = getCurrentArtworkIds()) => {
    try {
      setCheckingDuplicates(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auctions/${auctionId}/artworks`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const existingArtworkIds = data.artworks?.map((artwork: any) => artwork.id.toString()) || []
        const duplicates = artworkIds.filter(id => existingArtworkIds.includes(id))
        setDuplicateArtworks(duplicates)
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err)
    } finally {
      setCheckingDuplicates(false)
    }
  }

  // Get the current artwork IDs based on input mode
  const getCurrentArtworkIds = (): string[] => {
    return artworkInputMode === 'manual' ? parsedArtworkIds : selectedArtworks
  }

  const handleAddToAuction = async () => {
    if (mode === 'existing') {
      return handleAddToExistingAuction()
    } else {
      return handleCreateNewAuction()
    }
  }

  const handleAddToExistingAuction = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (!selectedAuction) {
        setError('Please select an auction')
        return
      }

      const artworkIds = getCurrentArtworkIds()
      if (artworkIds.length === 0) {
        setError('Please select or enter artwork IDs')
        return
      }

      // Validate that we have artwork IDs
      if (!artworkIds || artworkIds.length === 0) {
        setError('Please select or enter artwork IDs')
        return
      }

      // Check for duplicates first
      await checkForDuplicates(selectedAuction.id, artworkIds)

      if (duplicateArtworks.length > 0) {
        setError(`${duplicateArtworks.length} artworks are already in this auction. Please review and continue if you want to add duplicates.`)
        return
      }

      // Add artworks to existing auction
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auctions/${selectedAuction.id}/assign-artworks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ artwork_ids: artworkIds.map(id => parseInt(id)) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add artworks to auction')
      }

      setSuccess(`Successfully added ${artworkIds.length} artworks to ${selectedAuction.short_name}`)
      
      setTimeout(() => {
        onComplete?.(selectedAuction.id)
      }, 1500)

    } catch (err: any) {
      setError(err.message || 'Failed to add artworks to auction')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewAuction = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Validation
      if (!auctionName.trim()) {
        setError('Auction name is required')
        return
      }

      if (!selectedBrand) {
        setError('Please select a brand')
        return
      }

      if (!settlementDate) {
        setError('Settlement date is required')
        return
      }

      // Get current artwork IDs
      const artworkIds = getCurrentArtworkIds()

      // Validate that we have artwork IDs
      if (!artworkIds || artworkIds.length === 0) {
        setError('Please select or enter artwork IDs')
        return
      }

      // Generate short name from auction name (max 50 chars)
      const shortName = auctionName.trim().substring(0, 50)

      // Create auction data matching the backend expected structure
      const auctionData = {
        type: auctionType,
        short_name: shortName,
        long_name: auctionName.trim(),
        description: auctionDescription.trim() || 'Generated auction from selected artworks',
        settlement_date: settlementDate,
        catalogue_launch_date: catalogueLaunchDate || '',
        auction_days: [],
        artwork_ids: artworkIds.map((id: string) => parseInt(id)), // Convert string IDs to numbers
        brand_code: selectedBrand
      }

      // Create the auction
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(auctionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create auction')
      }

      const result = await response.json()
      console.log('result', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create auction')
      }

      const auctionId = result.data.id

      setSuccess(`Auction "${auctionName}" created successfully! (${selectedArtworks.length} artworks added to auction)`)
      
      // Call completion callback
      if (onComplete) {
        onComplete(auctionId.toString())
      }

      // Redirect to auction view after a short delay
      setTimeout(() => {
        router.push(`/auctions/view/${auctionId}`)
      }, 2000)

    } catch (err: any) {
      console.error('Error creating auction:', err)
      setError(err.message || 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Add to Auction</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Add artworks to an auction.
        </p>

        {/* Artwork Input Mode Selection */}
        <div className="mb-4">
          <div className="flex space-x-4 mb-3">
            <button
              onClick={() => setArtworkInputMode('selected')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                artworkInputMode === 'selected'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Use Selected Artworks ({selectedArtworks.length})
            </button>
            <button
              onClick={() => setArtworkInputMode('manual')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                artworkInputMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Enter Artwork IDs
            </button>
          </div>
        </div>

        {/* Selected Artworks Display */}
        {artworkInputMode === 'selected' && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-4">
            Selected artworks: {selectedArtworks.slice(0, 3).join(', ')}
            {selectedArtworks.length > 3 && ` and ${selectedArtworks.length - 3} more...`}
          </div>
        )}

        {/* Manual Artwork ID Input */}
        {artworkInputMode === 'manual' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artwork IDs *
            </label>
            <textarea
              value={manualArtworkIds}
              onChange={(e) => setManualArtworkIds(e.target.value)}
              placeholder="Enter artwork IDs (e.g., 1,2,3,10,12 or 1-20 for ranges)"
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter individual IDs separated by commas, or use ranges (e.g., 1-20)
            </p>

            {/* Parsed IDs Display */}
            {parsedArtworkIds.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <strong>Parsed IDs:</strong> {parsedArtworkIds.join(', ')}
                <span className="text-blue-600 ml-2">({parsedArtworkIds.length} total)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
              mode === 'existing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Add to Existing Auction
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
              mode === 'new'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Create New Auction
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        {mode === 'existing' ? (
          /* Existing Auction Selection */
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Auction *
            </label>
            {auctionsLoading ? (
              <div className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-500">
                Loading auctions...
              </div>
            ) : existingAuctions.length === 0 ? (
              <div className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-500">
                No planned auctions available. Create a new auction instead.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {existingAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAuction?.id === auction.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedAuction(auction)
                      checkForDuplicates(auction.id, getCurrentArtworkIds())
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{auction.short_name}</p>
                        <p className="text-xs text-gray-500">{auction.long_name}</p>
                        <p className="text-xs text-gray-400">
                          Settlement: {new Date(auction.settlement_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {(auction.artwork_ids?.length || 0)} lots
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Duplicate Check Results */}
            {selectedAuction && checkingDuplicates && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="text-yellow-700">Checking for duplicate artworks...</span>
                </div>
              </div>
            )}
            
            {selectedAuction && !checkingDuplicates && duplicateArtworks.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700">
                    {duplicateArtworks.length} artwork(s) already exist in this auction
                  </span>
                </div>
              </div>
            )}
            
            {selectedAuction && !checkingDuplicates && duplicateArtworks.length === 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">
                    No duplicate artworks found. Ready to add!
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* New Auction Form */
          <>
            {/* Brand Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand *
              </label>
              {brandsLoading ? (
                <div className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-500">
                  Loading brands...
                </div>
              ) : (
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  disabled={brands.length === 0}
                >
                  {brands.length === 0 ? (
                    <option value="">No brands available</option>
                  ) : (
                    <>
                      <option value="">Select a brand</option>
                      {brands.map((brand) => (
                        <option key={brand.code} value={brand.code}>
                          {brand.name} ({brand.code})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              )}
            </div>

        {/* Auction Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auction Name *
          </label>
          <input
            type="text"
            value={auctionName}
            onChange={(e) => setAuctionName(e.target.value)}
            placeholder="Enter auction name..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Auction Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={auctionDescription}
            onChange={(e) => setAuctionDescription(e.target.value)}
            placeholder="Enter auction description..."
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Auction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auction Type *
          </label>
          <select
            value={auctionType}
            onChange={(e) => setAuctionType(e.target.value as 'live' | 'timed' | 'sealed_bid')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="timed">Timed Auction</option>
            <option value="live">Live Auction</option>
            <option value="sealed_bid">Private Sale</option>
          </select>
        </div>

        {/* Date Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Settlement Date *
            </label>
            <input
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Final payment deadline</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catalogue Launch Date (Optional)
            </label>
            <input
              type="date"
              value={catalogueLaunchDate}
              onChange={(e) => setCatalogueLaunchDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">When catalogue becomes available (optional)</p>
          </div>
        </div>
          </>
        )}
      </div>

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

      {/* Preview */}
      {auctionName && settlementDate && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Auction Preview:</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Name:</strong> {auctionName}</p>
            <p><strong>Type:</strong> {auctionType.charAt(0).toUpperCase() + auctionType.slice(1)}</p>
            <p><strong>Brand:</strong> {brands.find(b => b.code === selectedBrand)?.name}</p>
            <p><strong>Settlement Date:</strong> {formatDate(settlementDate)}</p>
            {catalogueLaunchDate && <p><strong>Catalogue Launch:</strong> {formatDate(catalogueLaunchDate)}</p>}
            <p><strong>Lots:</strong> {getCurrentArtworkIds().length} artworks</p>
            {artworkInputMode === 'manual' && parsedArtworkIds.length > 0 && (
              <p><strong>Artwork IDs:</strong> {parsedArtworkIds.slice(0, 10).join(', ')}
                {parsedArtworkIds.length > 10 && `... (${parsedArtworkIds.length} total)`}</p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleAddToAuction}
          disabled={
            loading ||
            getCurrentArtworkIds().length === 0 ||
            (mode === 'new' && (!auctionName.trim() || !settlementDate || !selectedBrand)) ||
            (mode === 'existing' && !selectedAuction)
          }
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {mode === 'existing' ? 'Adding...' : 'Creating...'}
            </>
          ) : (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              {mode === 'existing' ? 'Add to Auction' : 'Create Auction'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
