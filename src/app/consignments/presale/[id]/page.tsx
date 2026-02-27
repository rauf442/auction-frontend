// frontend/src/app/consignments/presale/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPresaleOptions, PresaleOptionsResponse, PresaleOption } from '@/lib/consignments-api'
import { generateAuctionPreSaleInvoicePDF } from '@/lib/consignment-pdf-api'
import { ArrowLeft, FileText, Calendar, Package, DollarSign, User, Building } from 'lucide-react'
import Link from 'next/link'

export default function PresaleOptionsPage() {
  const params = useParams()
  const router = useRouter()
  const consignmentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [data, setData] = useState<PresaleOptionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (consignmentId) {
      fetchPresaleOptions()
    }
  }, [consignmentId])

  const fetchPresaleOptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getPresaleOptions(consignmentId)
      setData(response)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch presale options')
      console.error('Error fetching presale options:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (option: PresaleOption) => {
    try {
      setGenerating(option.auction_id.toString())

      // Prepare sale details for the PDF using auction information
      const saleDetails = {
        sale_name: option.auction_long_name || option.auction_short_name,
        sale_date: option.auction_settlement_date,
        sale_location: option.brand_name || 'TBD',
        viewing_dates: option.auction_catalogue_launch_date ?
          [`Catalogue Launch: ${new Date(option.auction_catalogue_launch_date).toLocaleDateString()}`] :
          ['Date TBD']
      }

      await generateAuctionPreSaleInvoicePDF(consignmentId, option.auction_id, saleDetails)
    } catch (err: any) {
      console.error('Error generating PDF:', err)
      alert('Error generating PDF. Please try again.')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pre-sale invoice options...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <button
              onClick={fetchPresaleOptions}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.presaleOptions || data.presaleOptions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href={`/consignments/view/${consignmentId}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Consignment
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Pre-Sale Invoice Options</h2>
            <p className="text-gray-600 mb-4">
              {data?.message || 'No auctions found containing items from this consignment.'}
            </p>
            <Link
              href={`/consignments/view/${consignmentId}`}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 inline-block"
            >
              Back to Consignment
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/consignments/view/${consignmentId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Consignment
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pre-Sale Invoice Options</h1>
            <p className="text-gray-600">
              Consignment #{consignmentId} • {data.total_items} non-returned item(s) available
            </p>
            <p className="text-sm text-gray-500 mt-1">{data.message}</p>
          </div>
        </div>

        {/* Pre-sale Options Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.presaleOptions.map((option) => (
            <div key={option.auction_id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Auction Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{option.auction_short_name}</h3>
                    <p className="text-blue-100 text-sm">{option.auction_long_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-200 text-blue-800">
                      {option.auction_type || 'Auction'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Auction Details */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Settlement Date</p>
                      <p className="text-sm font-medium">
                        {new Date(option.auction_settlement_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Brand</p>
                      <p className="text-sm font-medium">
                        {option.brand_name || 'N/A'} ({option.brand_code || 'N/A'})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Specialist</p>
                      <p className="text-sm font-medium">{option.specialist_name || 'Not assigned'}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Package className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Items in Auction</p>
                      <p className="text-sm font-medium">{option.items_count} item(s)</p>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Items Summary</h4>
                  <div className="space-y-2">
                    {option.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            ID: {item.id} • Artist: {item.artists?.name || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          {item.low_est && item.high_est && (
                            <p className="text-xs text-gray-600">
                              £{item.low_est.toLocaleString()} - £{item.high_est.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {option.items.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        ... and {option.items.length - 3} more item(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Low Estimate</p>
                      <p className="text-sm font-medium">£{option.total_low_est.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">High Estimate</p>
                      <p className="text-sm font-medium">£{option.total_high_est.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reserve</p>
                      <p className="text-sm font-medium">£{option.total_reserve.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="mt-6">
                  <button
                    onClick={() => handleGeneratePDF(option)}
                    disabled={generating === option.auction_id.toString()}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {generating === option.auction_id.toString() ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Pre-Sale Invoice
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
