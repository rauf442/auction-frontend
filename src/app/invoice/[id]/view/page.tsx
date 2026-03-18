// frontend/src/app/invoice/[id]/view/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, Package, User, MapPin, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface InvoiceData {
  id: number
  invoice_number: string
  auction_id?: number
  brand_id?: number
  client_id?: number
  platform?: string
  lot_ids?: string[]
  item_ids?: number[]
  title?: string
  hammer_price?: number
  buyers_premium?: number
  buyer_first_name?: string
  buyer_last_name?: string
  buyer_email?: string
  buyer_phone?: string
  shipping_method?: string
  shipping_status?: string
  ship_to_phone?: string
  ship_to_first_name?: string
  ship_to_last_name?: string
  ship_to_company?: string
  ship_to_address?: string
  ship_to_city?: string
  ship_to_state?: string
  ship_to_country?: string
  ship_to_postal_code?: string
  paddle_number?: string
  premium_bidder?: boolean
  total_amount?: number
  buyer_price?: number
  total_shipping_amount?: number
  shipping_charge?: number
  insurance_charge?: number
  tracking_number?: string
  invoice_date?: string
  status?: string
  type?: 'buyer' | 'vendor'
  paid_amount?: number
  created_at?: string
  // Related data
  client?: {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone_number?: string
  }
  auction?: {
    id: number
    short_name: string
    long_name: string
    settlement_date?: string
  }
  brand?: {
    id: number
    name: string
    code: string
  }
  items?: Array<{
    id: number
    title: string
    artist_maker?: string
    description?: string
    dimensions?: string
    medium?: string
  }>
}

export default function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('InvoiceViewPage params:', resolvedParams)
    console.log('Invoice ID from params:', resolvedParams.id)
    fetchInvoice()
  }, [resolvedParams.id])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const invoiceId = resolvedParams.id

      console.log('Fetching invoice with ID:', invoiceId)
      console.log('API URL:', `/api/invoices/${invoiceId}`)

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('API response status:', response.status)
      console.log('API response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('API error response:', errorText)
        throw new Error(`Failed to fetch invoice: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('API response data:', result)

      if (result.success) {
        setInvoice(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch invoice')
      }
    } catch (err: any) {
      console.error('Error fetching invoice:', err)
      setError(err.message || 'Failed to fetch invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (type: 'internal' | 'final') => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/invoices/${resolvedParams.id}/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          type,
          brand_code: invoice?.brand?.code 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `invoice-${invoice?.invoice_number}-${type}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Error generating PDF:', err)
      toast.error('Failed to generate PDF: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  const handleBackNavigation = () => {
    // Check URL search params first (most reliable)
    const urlParams = new URLSearchParams(window.location.search)
    const from = urlParams.get('from')

    if (from) {
      if (from === 'invoices') {
        router.push('/invoices')
        return
      }
      if (from === 'auctions') {
        router.push('/auctions')
        return
      }
      if (from === 'clients') {
        router.push('/clients')
        return
      }
      if (from.startsWith('/')) {
        router.push(from)
        return
      }
    }

    // Fallback to referrer check
    const referrer = document.referrer
    if (referrer.includes('/invoices')) {
      router.push('/invoices')
      return
    }
    if (referrer.includes('/auctions')) {
      router.push('/auctions')
      return
    }
    if (referrer.includes('/clients')) {
      router.push('/clients')
      return
    }

    // Default fallback - try to go back in history, or go to invoices page
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/invoices')
    }
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={handleBackNavigation} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Not Found</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Invoice not found'}</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Use the calculated total_amount from the API response
  const getTotalAmount = (invoice: InvoiceData) => {
    return invoice.total_amount || 0
  }

  // Use the calculated buyer_price from the API response
  const getBuyerPrice = (invoice: InvoiceData) => {
    return invoice.buyers_premium || 0
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={handleBackNavigation} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-gray-600">{invoice.invoice_number}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={() => handleGeneratePDF('internal')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Internal Invoice
          </Button>
          <Button onClick={() => handleGeneratePDF('final')}>
            <Download className="h-4 w-4 mr-2" />
            Final Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Invoice Number:</span>
                <p className="text-gray-900">{invoice.invoice_number}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <p className="text-gray-900 capitalize">{invoice.status || 'Draft'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Platform:</span>
                <p className="text-gray-900">{invoice.platform || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Lot IDs:</span>
                <p className="text-gray-900">{invoice.lot_ids?.length ? invoice.lot_ids.join(', ') : 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Item IDs:</span>
                <p className="text-gray-900">{invoice.item_ids?.length ? invoice.item_ids.join(', ') : 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Paddle Number:</span>
                <p className="text-gray-900">{invoice.paddle_number || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Premium Bidder:</span>
                <p className="text-gray-900">{invoice.premium_bidder ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            {invoice.invoice_date && (
              <div>
                <span className="font-medium text-gray-700">Invoice Date:</span>
                <p className="text-gray-900">{formatDate(invoice.invoice_date)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auction Information */}
        {invoice.auction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Auction Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Auction:</span>
                <p className="text-gray-900">{invoice.auction.long_name}</p>
                <p className="text-sm text-gray-600">{invoice.auction.short_name}</p>
              </div>
              {invoice.auction.settlement_date && (
                <div>
                  <span className="font-medium text-gray-700">Settlement Date:</span>
                  <p className="text-gray-900">{formatDate(invoice.auction.settlement_date)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Buyer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <p className="text-gray-900">
                {invoice.client 
                  ? `${invoice.client.first_name} ${invoice.client.last_name}`
                  : `${invoice.buyer_first_name || ''} ${invoice.buyer_last_name || ''}`.trim() || 'N/A'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <p className="text-gray-900">{invoice.client?.email || invoice.buyer_email || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <p className="text-gray-900">{invoice.client?.phone_number || invoice.buyer_phone || 'N/A'}</p>
            </div>
            {invoice.client?.id && (
              <div>
                <span className="font-medium text-gray-700">Client ID:</span>
                <p className="text-gray-900">{invoice.brand?.code || 'MSL'}-{String(invoice.client.id).padStart(3, '0')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Shipping Method:</span>
              <p className="text-gray-900">{invoice.shipping_method || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Shipping Status:</span>
              <p className="text-gray-900 capitalize">{invoice.shipping_status || 'N/A'}</p>
            </div>
            {(invoice.ship_to_first_name || invoice.ship_to_last_name) && (
              <div>
                <span className="font-medium text-gray-700">Ship To:</span>
                <p className="text-gray-900">{`${invoice.ship_to_first_name || ''} ${invoice.ship_to_last_name || ''}`.trim()}</p>
              </div>
            )}
            {invoice.ship_to_company && (
              <div>
                <span className="font-medium text-gray-700">Company:</span>
                <p className="text-gray-900">{invoice.ship_to_company}</p>
              </div>
            )}
            {invoice.ship_to_address && (
              <div>
                <span className="font-medium text-gray-700">Address:</span>
                <div className="text-gray-900">
                  <p>{invoice.ship_to_address}</p>
                  {invoice.ship_to_city && <p>{invoice.ship_to_city}</p>}
                  {invoice.ship_to_state && <p>{invoice.ship_to_state}</p>}
                  {invoice.ship_to_postal_code && <p>{invoice.ship_to_postal_code}</p>}
                  {invoice.ship_to_country && <p>{invoice.ship_to_country}</p>}
                </div>
              </div>
            )}
            {invoice.ship_to_phone && (
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <p className="text-gray-900">{invoice.ship_to_phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracking Information */}
        {invoice.tracking_number && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Tracking Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium text-gray-700">Tracking Number:</span>
                <p className="text-lg font-mono text-gray-900 mt-1">{invoice.tracking_number}</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => window.open(`https://parcelcompare.com/courierservices/searchtracking/${invoice.tracking_number}`, '_blank')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Track Order
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This will open the tracking information in a new tab
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items/Artworks */}
        {invoice.items && invoice.items.length > 0 && invoice.item_ids && invoice.item_ids.length > 0 ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Artwork Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        {item.artist_maker && (
                          <p className="text-sm text-gray-600 uppercase mt-1">{item.artist_maker}</p>
                        )}
                        {item.description && (
                          <p className="text-sm text-gray-700 mt-2">{item.description}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        {item.dimensions && (
                          <div>
                            <span className="font-medium text-gray-700">Dimensions:</span>
                            <p className="text-gray-900">{item.dimensions}</p>
                          </div>
                        )}
                        {item.medium && (
                          <div>
                            <span className="font-medium text-gray-700">Medium:</span>
                            <p className="text-gray-900">{item.medium}</p>
                          </div>
                        )}
                        {invoice.lot_ids && invoice.lot_ids[index] && (
                          <div>
                            <span className="font-medium text-gray-700">Lot Number:</span>
                            <p className="text-gray-900">{invoice.lot_ids[index]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Artwork Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No artwork details available</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(!invoice.item_ids || invoice.item_ids.length === 0) ? 'No items associated with this invoice' : 'Items data not available'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <span className="font-medium text-gray-700">Hammer Price:</span>
                <p className="text-xl font-bold text-gray-900">
                  {invoice.hammer_price ? formatCurrency(invoice.hammer_price) : '£0.00'}
                </p>
              </div>
              <div className="space-y-2">
                <span className="font-medium text-gray-700">
                  {invoice.type === 'vendor' ? "Vendor's Premium:" : "Buyer's Premium:"}
                </span>
                <p className="text-xl font-bold text-gray-900">
                  {getBuyerPrice(invoice) ? formatCurrency(getBuyerPrice(invoice)) : '£0.00'}
                </p>
              </div>
              {invoice.type !== 'vendor' && (
                <div className="space-y-2">
                  <span className="font-medium text-gray-700">Shipping:</span>
                  <p className="text-xl font-bold text-gray-900">
                    {invoice.total_shipping_amount || invoice.shipping_charge
                      ? formatCurrency(Math.round(invoice.total_shipping_amount || invoice.shipping_charge || 0))
                      : '£0.00'}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <span className="font-medium text-gray-700">Total Amount:</span>
                <p className="text-2xl font-bold text-teal-600">
                  {formatCurrency(getTotalAmount(invoice))}
                </p>
              </div>
            </div>
            
            {/* Additional Charges - Only show for buyer invoices */}
            {invoice.type !== 'vendor' && (invoice.shipping_charge || invoice.insurance_charge) && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-4">Shipping Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {invoice.shipping_charge && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Shipping:</span>
                      <span className="text-gray-900">{formatCurrency(Math.round(invoice.shipping_charge))}</span>
                    </div>
                  )}
                  {invoice.insurance_charge && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance:</span>
                      <span className="text-gray-900">{formatCurrency(Math.round(invoice.insurance_charge))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
