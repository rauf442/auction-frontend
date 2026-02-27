// frontend/src/app/auctions/[id]/invoices/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, FileText } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { getAuctions, getAuctionInvoices, type Auction, type Invoice } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'
import InvoiceTable from '@/components/invoices/InvoiceTable'

export default function AuctionInvoicesPage() {
  const router = useRouter()
  const params = useParams()
  const { brand } = useBrand()
  const auctionId = params.id as string

  const [auction, setAuction] = useState<Auction | null>(null)
  const [buyerInvoices, setBuyerInvoices] = useState<Invoice[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [buyerLoading, setBuyerLoading] = useState(false)
  const [vendorLoading, setVendorLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEOADialog, setShowEOADialog] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])

  // Get brand ID from brand code
  const getBrandId = useCallback((brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }, [brands])

  const loadBuyerInvoices = useCallback(async () => {
    try {
      setBuyerLoading(true)
      const brandId = getBrandId(brand)
      const response = await getAuctionInvoices(auctionId, {
        type: 'buyer',
        brand_id: brandId
      })

      if (response.success) {
        setBuyerInvoices(response.data.invoices)
      }
    } catch (err: any) {
      console.error('Error loading buyer invoices:', err)
    } finally {
      setBuyerLoading(false)
    }
  }, [auctionId, brand, getBrandId])

  const loadVendorInvoices = useCallback(async () => {
    try {
      setVendorLoading(true)
      const brandId = getBrandId(brand)
      const response = await getAuctionInvoices(auctionId, {
        type: 'vendor',
        brand_id: brandId
      })

      if (response.success) {
        setVendorInvoices(response.data.invoices)
      }
    } catch (err: any) {
      console.error('Error loading vendor invoices:', err)
    } finally {
      setVendorLoading(false)
    }
  }, [auctionId, brand, getBrandId])

  const loadBrands = useCallback(async () => {
    try {
      const response = await getBrands()
      if (response.success) {
        setBrands(response.data)
      }
    } catch (err: any) {
      console.error('Error loading brands:', err)
    }
  }, [])

  const loadAuctionAndInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load auction details
      const brandId = getBrandId(brand)
      const auctionsResponse = await getAuctions({
        page: 1,
        limit: 100,
        brand_id: brandId
      })

      const foundAuction = auctionsResponse.auctions.find(a => a.id.toString() === auctionId)

      if (!foundAuction) {
        setError('Auction not found')
        return
      }

      setAuction(foundAuction)

      // Load invoices for this auction
      await loadBuyerInvoices()
      await loadVendorInvoices()

    } catch (err: any) {
      console.error('Error loading auction and invoices:', err)
      setError(err.message || 'Failed to load auction and invoices')
    } finally {
      setLoading(false)
    }
  }, [auctionId, brand, loadBuyerInvoices, loadVendorInvoices, getBrandId])

  // Load brands on component mount
  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  useEffect(() => {
    if (auctionId && brands.length > 0) {
      loadAuctionAndInvoices()
    }
  }, [auctionId, loadAuctionAndInvoices, brands.length])

  const handleRefreshBuyer = () => {
    loadBuyerInvoices()
  }

  const handleRefreshVendor = () => {
    loadVendorInvoices()
  }



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading invoices...</span>
      </div>
    )
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Auction not found'}</p>
          <button
            onClick={() => router.push('/auctions')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/auctions/view/${auctionId}`)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Auction Invoices</h1>
                <p className="text-gray-600">{auction.long_name || auction.short_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {buyerInvoices.length === 0 && vendorInvoices.length === 0 && (
                <button
                  onClick={() => setShowEOADialog(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Import EOA Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(buyerInvoices.length === 0 && vendorInvoices.length === 0) ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoice Data Found</h3>
            <p className="text-gray-600 mb-4">
              To generate invoices for this auction, you need to import EOA (End of Auction) data first.
            </p>
            <button
              onClick={() => setShowEOADialog(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Import EOA Data
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Buyer Invoices */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Buyer Invoices ({buyerInvoices.length})</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Total Amount: {formatCurrency(buyerInvoices.reduce((sum, inv) => sum + ((inv.hammer_price || 0) + (inv.buyers_premium || 0)), 0))}</span>
                    <span>Paid: {buyerInvoices.filter(inv => inv.status === 'paid').length}</span>
                    <span>Unpaid: {buyerInvoices.filter(inv => inv.status === 'unpaid').length}</span>
                    <span>Cancelled: {buyerInvoices.filter(inv => inv.status === 'cancelled').length}</span>
                  </div>
                </div>
              </div>

              <InvoiceTable
                invoices={buyerInvoices}
                loading={buyerLoading}
                onRefresh={handleRefreshBuyer}
                invoiceType="buyer"
              />
            </div>

            {/* Vendor Invoices */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Vendor Invoices ({vendorInvoices.length})</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Total Amount: {formatCurrency(vendorInvoices.reduce((sum, inv) => sum + ((inv.hammer_price || 0) + (inv.buyers_premium || 0)), 0))}</span>
                    <span>Paid: {vendorInvoices.filter(inv => inv.status === 'paid').length}</span>
                    <span>Unpaid: {vendorInvoices.filter(inv => inv.status === 'unpaid').length}</span>
                    <span>Cancelled: {vendorInvoices.filter(inv => inv.status === 'cancelled').length}</span>
                  </div>
                </div>
              </div>

              <InvoiceTable
                invoices={vendorInvoices}
                loading={vendorLoading}
                onRefresh={handleRefreshVendor}
                invoiceType="vendor"
              />
            </div>
          </div>
        )}
      </div>

      {/* EOA Import Dialog */}
      {showEOADialog && (
        <EOAImportDialog
          auctionId={parseInt(auctionId)}
          onClose={() => setShowEOADialog(false)}
          onImportComplete={(importedCount) => {
            console.log(`Imported ${importedCount} EOA records`)
            loadBuyerInvoices() // Reload buyer invoices after import
            loadVendorInvoices() // Reload vendor invoices after import
            setShowEOADialog(false)
          }}
        />
      )}
    </div>
  )
}
