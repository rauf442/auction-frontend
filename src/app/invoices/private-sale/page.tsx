// frontend/src/app/invoices/private-sale/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { formatCurrency, ArtworksAPI } from '@/lib/items-api'
import { fetchClients, type Client } from '@/lib/clients-api'
import MediaRenderer from '@/components/ui/MediaRenderer'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://auction-backend-hjfa.onrender.com/api'

interface Item {
  id: number
  title: string
  images?: string[]
  low_est?: number
  high_est?: number
  status: string
  lot_num?: number
  vendor_id?: number | null  // ← added vendor_id
}

interface Auction {
  id: number
  short_name: string
  long_name: string
  brand_id: number
  artwork_ids?: number[]
}

export default function PrivateSaleInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Determine entry mode
  const itemIdParam = searchParams?.get('item_id')
  const auctionIdParam = searchParams?.get('auction_id')
  const entryMode = itemIdParam ? 'item' : auctionIdParam ? 'auction' : null

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Data state
  const [item, setItem] = useState<Item | null>(null)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Form state
  const [selectedAuctionId, setSelectedAuctionId] = useState<number | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null) // ← added vendor state
  const [salePrice, setSalePrice] = useState<string>('')

  useEffect(() => {
    if (!entryMode) {
      setError('Invalid entry point. Please select an item or auction first.')
      setLoading(false)
      return
    }

    loadInitialData()
  }, [entryMode, itemIdParam, auctionIdParam])

  // Auto-populate vendor when item is selected
  useEffect(() => {
    if (!selectedItemId) return

    // Check in items list (auction mode)
    const foundItem = items.find(i => i.id === selectedItemId)
    if (foundItem?.vendor_id) {
      setSelectedVendorId(foundItem.vendor_id)
      return
    }

    // Check single item (item mode)
    if (item?.vendor_id) {
      setSelectedVendorId(item.vendor_id)
    }
  }, [selectedItemId, items, item])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get token once at the top for all authenticated requests
      const token = localStorage.getItem('token')

      if (entryMode === 'item' && itemIdParam) {
        // Load item details
        const itemResponse = await ArtworksAPI.getArtwork(itemIdParam)

        if (itemResponse.success && itemResponse.data) {
          setItem(itemResponse.data as any)
          setSelectedItemId(parseInt(itemIdParam))

          // Load auctions containing this item
          const auctionsResponse = await fetch(`${API_BASE_URL}/auctions?page=1&limit=100`, {
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          })

          if (auctionsResponse.ok) {
            const auctionsData = await auctionsResponse.json()
            const relevantAuctions = (auctionsData.auctions || []).filter((auction: Auction) =>
              auction.artwork_ids && auction.artwork_ids.includes(parseInt(itemIdParam))
            )
            setAuctions(relevantAuctions)
          }
        }
      } else if (entryMode === 'auction' && auctionIdParam) {
        // Load auction details
        const auctionResponse = await fetch(`${API_BASE_URL}/auctions/${auctionIdParam}`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (auctionResponse.ok) {
          const auctionData = await auctionResponse.json()
          setAuctions([auctionData])
          setSelectedAuctionId(parseInt(auctionIdParam))

          // Load items in this auction (not sold)
          if (auctionData.artwork_ids && auctionData.artwork_ids.length > 0) {
            const itemIds = auctionData.artwork_ids.join(',')
            const itemsResponse = await ArtworksAPI.getArtworks({ item_ids: itemIds })

            if (itemsResponse.success) {
              // Filter out sold items and map to Item type with lot numbers
              const availableItems = itemsResponse.data
                .filter((item: any) => item.status !== 'sold')
                .map((item: any, _index: number) => {
                  // Find the lot number based on position in auction's artwork_ids
                  const lotNumber = auctionData.artwork_ids.indexOf(parseInt(item.id as string)) + 1

                  return {
                    id: parseInt(item.id as string),
                    title: item.title,
                    images: item.images,
                    low_est: item.low_est,
                    high_est: item.high_est,
                    status: item.status,
                    lot_num: lotNumber,
                    vendor_id: item.vendor_id || null // ← include vendor_id
                  }
                })
                // Sort items by lot number
                .sort((a, b) => (a.lot_num || 0) - (b.lot_num || 0))
              setItems(availableItems)
            }
          }
        }
      }

      // Load all clients for selection (used for both buyer and vendor dropdowns)
      const clientsData = await fetchClients({ page: 1, limit: 1000 })
      if (clientsData.success) {
        setClients(clientsData.data || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = async () => {
    // Validate form
    if (!selectedAuctionId) {
      setError('Please select an auction')
      return
    }
    if (!selectedItemId) {
      setError('Please select an item')
      return
    }
    if (!selectedClientId) {
      setError('Please select a buyer client')
      return
    }
    if (!salePrice || parseFloat(salePrice) <= 0) {
      setError('Please enter a valid sale price')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Get brand_id from selected auction
      const selectedAuction = auctions.find(a => a.id === selectedAuctionId)
      if (!selectedAuction) {
        setError('Selected auction not found')
        return
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/invoices/private-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          item_id: selectedItemId,
          auction_id: selectedAuctionId,
          client_id: selectedClientId,
          sale_price: parseFloat(salePrice),
          brand_id: selectedAuction.brand_id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create invoice')
      }

      const data = await response.json()

      // ── Assign vendor to item if a vendor was selected ────────────────────
      if (selectedVendorId && selectedItemId) {
        try {
          await fetch(`${API_BASE_URL}/items/assign-vendor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
              item_ids: [selectedItemId],
              vendor_id: selectedVendorId,
            })
          })
        } catch (vendorErr) {
          // Non-blocking: log but don't fail the invoice creation
          console.warn('Vendor assignment failed:', vendorErr)
        }
      }

      setSuccess(true)

      // Navigate to invoice view after short delay
      setTimeout(() => {
        router.push(`/invoices/${data.data.invoice_id}`)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!entryMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Entry Point</h2>
          <p className="text-gray-600 mb-6">
            Please navigate to this page from either the items page or invoices page.
          </p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go to Invoices
          </button>
        </div>
      </div>
    )
  }

  // Prepare options for SearchableSelect
  const auctionOptions = auctions.map(auction => ({
    value: auction.id.toString(),
    label: `${auction.short_name} - ${auction.long_name}`,
    description: `Auction ID: ${auction.id}`
  }))

  const itemOptions = (entryMode === 'item' && item ? [item] : items).map(itm => ({
    value: itm.id.toString(),
    label: itm.lot_num ? `Lot ${itm.lot_num}: ${itm.title}` : itm.title,
    description: itm.low_est && itm.high_est
      ? `Est: ${formatCurrency(itm.low_est)} - ${formatCurrency(itm.high_est)}`
      : 'No estimate'
  }))

  const clientOptions = clients
    .filter(client => client.id !== undefined)
    .map(client => ({
      value: client.id!.toString(),
      label: client.company_name || `${client.first_name} ${client.last_name}`,
      description: `${client.email}${client.buyer_premium ? ` • Premium: ${client.buyer_premium}%` : ''}`
    }))

  // Vendor options — same clients list, no buyer_premium needed
  const vendorOptions = clients
    .filter(client => client.id !== undefined)
    .map(client => ({
      value: client.id!.toString(),
      label: client.company_name || `${client.first_name} ${client.last_name}`,
      description: client.email || ''
    }))

  const selectedClient = clients.find(c => c.id === selectedClientId)
  const calculatedPremium = selectedClient && salePrice
    ? (parseFloat(salePrice) * (selectedClient.buyer_premium || 0)) / 100
    : 0
  const totalAmount = salePrice ? parseFloat(salePrice) + calculatedPremium : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Private Sale Invoice</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  {entryMode === 'item' ? 'Item-based entry' : 'Auction-based entry'}
                </p>
              </div>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Invoice Created Successfully!</p>
              <p className="text-sm text-green-700">Redirecting to invoice details...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auction Preview (if entry mode is auction) */}
        {entryMode === 'auction' && auctions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Auction</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">{auctions[0].long_name}</h4>
                <p className="text-sm text-gray-600">{auctions[0].short_name}</p>
                <p className="text-sm text-gray-500 mt-2">Auction ID: {auctions[0].id}</p>
              </div>
              <div className="text-right md:text-left">
                <p className="text-sm text-gray-600">
                  {auctions[0].artwork_ids ? auctions[0].artwork_ids.length : 0} items in auction
                </p>
                <p className="text-sm text-gray-600">
                  {items.length} unsold items available
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Item Preview (if entry mode is item) */}
        {entryMode === 'item' && item && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Item</h3>
            <div className="flex items-center gap-4">
              {item.images && item.images[0] && (
                <div className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden">
                  <MediaRenderer
                    src={item.images[0]}
                    alt={item.title}
                    aspectRatio="square"
                  />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.title}</h4>
                {item.low_est && item.high_est && (
                  <p className="text-sm text-gray-600 mt-1">
                    Estimate: {formatCurrency(item.low_est)} - {formatCurrency(item.high_est)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>

          {/* Auction Selection (shown if entry mode is item) */}
          {entryMode === 'item' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Auction <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={auctionOptions}
                value={selectedAuctionId?.toString() || null}
                onChange={(value) => setSelectedAuctionId(value ? parseInt(value as string) : null)}
                placeholder="Choose an auction..."
                inputPlaceholder="Search auctions..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Only auctions containing this item are shown
              </p>
            </div>
          )}

          {/* Item Selection (shown if entry mode is auction) */}
          {entryMode === 'auction' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Item <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={itemOptions}
                value={selectedItemId?.toString() || null}
                onChange={(value) => setSelectedItemId(value ? parseInt(value as string) : null)}
                placeholder="Choose an item..."
                inputPlaceholder="Search items..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Only unsold items from this auction are shown
              </p>
            </div>
          )}

          {/* Buyer Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Buyer <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={clientOptions}
              value={selectedClientId?.toString() || null}
              onChange={(value) => setSelectedClientId(value ? parseInt(value as string) : null)}
              placeholder="Choose a buyer..."
              inputPlaceholder="Search buyers by name or email..."
            />
          </div>

          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Vendor <span className="text-gray-400 text-xs font-normal">(Optional)</span>
            </label>
            <SearchableSelect
              options={vendorOptions}
              value={selectedVendorId?.toString() || null}
              onChange={(value) => setSelectedVendorId(value ? parseInt(value as string) : null)}
              placeholder="Choose a vendor..."
              inputPlaceholder="Search vendors by name or email..."
            />
            <p className="text-xs text-gray-500 mt-1">
              The consignor / seller of this item. Auto-filled if already assigned to the item.
            </p>
          </div>

          {/* Sale Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sale Price (GBP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Calculation Summary */}
          {selectedClient && salePrice && parseFloat(salePrice) > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-purple-900">Invoice Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Hammer Price:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(salePrice))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">
                    Buyer's Premium ({selectedClient.buyer_premium || 0}%):
                  </span>
                  <span className="font-medium">{formatCurrency(calculatedPremium)}</span>
                </div>
                <div className="border-t border-purple-300 pt-2 mt-2 flex justify-between">
                  <span className="font-semibold text-purple-900">Total Amount:</span>
                  <span className="font-bold text-purple-900">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreateInvoice}
            disabled={submitting || success || !selectedAuctionId || !selectedItemId || !selectedClientId || !salePrice}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Invoice...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Create Private Sale Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}