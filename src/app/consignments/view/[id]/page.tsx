"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  getConsignment, 
  type Consignment
} from '@/lib/consignments-api'
import { 
  fetchClient, 
  type Client, 
  formatClientDisplay, 
  getClientTypeDisplay, 
  getClientTypeColor 
} from '@/lib/clients-api'
import { 
  ArtworksAPI, 
  type Artwork 
} from '@/lib/items-api'
import PDFGenerator from '@/components/consignments/PDFGenerator'
import MediaRenderer from '@/components/ui/MediaRenderer'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Truck,
  Tag,
  Clock,
  Activity,
  TrendingUp,
  Eye,
  Edit,
  Palette,
  CheckCircle,
  XCircle,
  AlertCircle,
  Signature,
  Warehouse,
  Hash,
  Receipt,
  ArrowLeft,
  Download,
  Share2,
  Printer
} from 'lucide-react'

interface ConsignmentStats {
  totalItems: number
  totalEstimatedValue: number
  totalReserveValue: number
  averageEstimate: number
  soldItems: number
  soldValue: number
  remainingItems: number
  saleRate: number
}

// Using the Artwork interface from items-api (unified interface)

export default function ConsignmentViewPage() {
  const params = useParams()
  const router = useRouter()
  const consignmentId = params.id as string

  const [consignment, setConsignment] = useState<Consignment | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [items, setItems] = useState<Artwork[]>([])
  const [stats, setStats] = useState<ConsignmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPDFOptions, setShowPDFOptions] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        
        // Fetch consignment details
        const consignmentResp = await getConsignment(consignmentId)
        setConsignment(consignmentResp)
        
        // Fetch client details if client_id exists
        if (consignmentResp.client_id) {
          try {
            const clientResp = await fetchClient(consignmentResp.client_id)
            setClient(clientResp.data)
          } catch (clientError) {
            console.warn('Could not fetch client details:', clientError)
          }
        }
        
        // Fetch items for this consignment
        let fetchedItems: Artwork[] = []
        try {
          console.log('Fetching items for consignment ID:', consignmentId)
          const itemsResp = await ArtworksAPI.getArtworks({
            consignment_id: consignmentId, // Pass as string - backend will parse to int
            limit: 5000, // Get all items for this consignment (higher limit)
            status: 'all' // Include all statuses for consignment view
          })
          console.log('Items response:', itemsResp)
          fetchedItems = itemsResp.data || []
          setItems(fetchedItems)
        } catch (itemsError) {
          console.error('Could not fetch consignment items:', itemsError)
          setItems([]) // Set empty array if items can't be fetched
        }
        
        // Calculate stats from fetched items
        const calculatedStats: ConsignmentStats = {
          totalItems: fetchedItems.length,
          totalEstimatedValue: fetchedItems.reduce((sum, item) => sum + (((item.low_est || 0) + (item.high_est || 0)) / 2), 0),
          totalReserveValue: fetchedItems.reduce((sum, item) => sum + (item.reserve || 0), 0),
          averageEstimate: fetchedItems.length ? fetchedItems.reduce((sum, item) => sum + (((item.low_est || 0) + (item.high_est || 0)) / 2), 0) / fetchedItems.length : 0,
          soldItems: fetchedItems.filter(item => item.status === 'sold').length,
          soldValue: fetchedItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + (item.start_price || 0), 0),
          remainingItems: fetchedItems.filter(item => !['sold', 'withdrawn'].includes(item.status || '')).length,
          saleRate: fetchedItems.length ? (fetchedItems.filter(item => item.status === 'sold').length / fetchedItems.length) * 100 : 0
        }
        setStats(calculatedStats)
        
      } catch (err: any) {
        setError(err?.message || 'Failed to load consignment')
      } finally {
        setLoading(false)
      }
    }
    
    if (consignmentId) load()
  }, [consignmentId])

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Activity className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getItemStatusColor = (status?: string) => {
    switch (status) {
      case 'sold':
        return 'bg-green-100 text-green-800'
      case 'withdrawn':
        return 'bg-red-100 text-red-800'
      case 'passed':
        return 'bg-yellow-100 text-yellow-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const handlePDFGeneration = (type: 'consignment' | 'collection' | 'presale') => {
    console.log(`PDF generation triggered for ${type}`)
    setShowPDFOptions(false)
    // The actual PDF generation is handled by the PDFGenerator component in the UI
  }

  const handleShare = () => {
    const shareData = {
      title: `Consignment ${consignment?.id}`,
      text: `Consignment details for ${client?.first_name} ${client?.last_name}`,
      url: window.location.href
    }
    
    if (navigator.share) {
      navigator.share(shareData)
    } else {
      navigator.clipboard?.writeText(window.location.href)
      alert('Link copied to clipboard')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading consignment details...</p>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 mb-4">
          <FileText className="h-16 w-16 mx-auto" />
        </div>
        <p className="text-red-600 text-lg">{error}</p>
        <button 
          onClick={() => router.back()} 
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
        >
          Go Back
        </button>
      </div>
    </div>
  )
  
  if (!consignment) return null

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .bg-gray-50 {
            background: white !important;
          }
          .bg-gradient-to-r {
            background: white !important;
            color: black !important;
          }
          .text-white {
            color: black !important;
          }
          .shadow-lg {
            box-shadow: none !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Consignment {consignment.id}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-slate-200 text-sm">
                  {client ? `${client.first_name} ${client.last_name}` : consignment.client_name || 'Unknown Client'}
                </span>
                {client && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-200 text-sm">{formatClientDisplay(client)}</span>
                  </>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(consignment.status)}`}>
                  {consignment.status || 'active'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 no-print">
            {/* PDF Options Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowPDFOptions(!showPDFOptions)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Generate PDF</span>
              </button>
              
              {showPDFOptions && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="py-1">
                    {/* Only show PDF options if all required data is loaded */}
                    {client && consignment && !loading ? (
                      <>
                        <PDFGenerator
                          type="consignment"
                          consignment={{
                            id: consignmentId,
                            consignment_number: consignment.id?.toString() || '',
                            receipt_no: consignment.id?.toString() || '',
                            created_at: consignment.created_at || new Date().toISOString(),
                            specialist_name: consignment.specialist_name,
                            items_count: consignment.items_count,
                            total_estimated_value: consignment.total_estimated_value,
                            client_id: consignment.client_id
                          }}
                          client={{
                            ...client,
                            id: client.id || 0
                          }}
                          items={items as any}
                        >
                          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <div className="font-medium">Consignment Receipt</div>
                            <div className="text-xs text-gray-500">All artworks in consignment</div>
                          </button>
                        </PDFGenerator>
                        
                        <PDFGenerator
                          type="collection"
                          consignment={{
                            id: consignmentId,
                            consignment_number: consignment.id?.toString() || '',
                            receipt_no: consignment.id?.toString() || '',
                            created_at: consignment.created_at || new Date().toISOString(),
                            specialist_name: consignment.specialist_name,
                            items_count: consignment.items_count,
                            total_estimated_value: consignment.total_estimated_value,
                            client_id: consignment.client_id
                          }}
                          client={{
                            ...client,
                            id: client.id || 0
                          }}
                          items={items as any}
                        >
                          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <div className="font-medium">Collection Back Receipt</div>
                            <div className="text-xs text-gray-500">Returned artworks only</div>
                          </button>
                        </PDFGenerator>
                        
                        <Link href={`/consignments/presale/${consignmentId}`}>
                          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <div className="font-medium">Pre-Sale Invoice</div>
                            <div className="text-xs text-gray-500">Artworks going to auction</div>
                          </button>
                        </Link>

                        <PDFGenerator
                          type="public"
                          consignment={{
                            id: consignmentId,
                            consignment_number: consignment.id?.toString() || '',
                            receipt_no: consignment.id?.toString() || '',
                            created_at: consignment.created_at || new Date().toISOString(),
                            specialist_name: consignment.specialist_name,
                            items_count: consignment.items_count,
                            total_estimated_value: consignment.total_estimated_value,
                            client_id: consignment.client_id
                          }}
                          client={{
                            ...client,
                            id: client.id || 0
                          }}
                          items={items as any}
                        >
                          <button className="block w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-purple-50">
                            <div className="font-medium">Public Consignment PDF View</div>
                            <div className="text-xs text-purple-600">Accessible to all users</div>
                          </button>
                        </PDFGenerator>
                      </>
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        <div className="text-center">
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mx-auto mb-2"></div>
                              <div>Loading PDF options...</div>
                            </>
                          ) : (
                            <>
                              <div>PDF generation unavailable</div>
                              <div className="text-xs mt-1">
                                {!client && 'Client data not loaded'}
                                {!consignment && 'Consignment data not loaded'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleShare}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            
            <button 
              onClick={handlePrint}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
            
            <Link 
              href={`/consignments/edit/${consignmentId}`} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
            
            <Link 
              href="/consignments" 
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-black px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                    <p className="text-xs text-gray-500">{stats.remainingItems} remaining</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-3 mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estimated Value</p>
                    <p className="text-2xl font-bold text-gray-900">£{(stats.totalEstimatedValue || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Avg £{(stats.averageEstimate || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 rounded-full p-3 mr-4">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sold Value</p>
                    <p className="text-2xl font-bold text-gray-900">£{(stats.soldValue || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{stats.soldItems} items sold</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-orange-100 rounded-full p-3 mr-4">
                    <Activity className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sale Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.saleRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Performance</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Consignment & Client Details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Consignment Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-gray-600" />
                  Consignment Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Hash className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Consignment Number</p>
                      <p className="font-medium text-gray-900">{consignment.id}</p>
                    </div>
                  </div>
                  
                  {consignment.id && (
                    <div className="flex items-center">
                      <Receipt className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Receipt Number</p>
                        <p className="font-medium text-gray-900">{consignment.id}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Specialist</p>
                      <p className="font-medium text-gray-900">{consignment.specialist_name || 'Not assigned'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(consignment.status)}`}>
                        {consignment.status || 'active'}
                      </span>
                    </div>
                  </div>
                  
                  {consignment.is_signed && (
                    <div className="flex items-center">
                      <Signature className="h-4 w-4 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Signed</p>
                        <p className="font-medium text-green-700">
                          {consignment.signing_date ? new Date(consignment.signing_date).toLocaleDateString() : 'Yes'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="font-medium text-gray-900">
                        {consignment.created_at ? new Date(consignment.created_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warehouse Information */}
              {(consignment.warehouse_location || consignment.warehouse_with_whom) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Warehouse className="h-5 w-5 mr-2 text-gray-600" />
                    Warehouse Details
                  </h3>
                  <div className="space-y-3">
                    {consignment.warehouse_location && (
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium text-gray-900">{consignment.warehouse_location}</p>
                      </div>
                    )}
                    {consignment.warehouse_with_whom && (
                      <div>
                        <p className="text-sm text-gray-600">With Whom</p>
                        <p className="font-medium text-gray-900">{consignment.warehouse_with_whom}</p>
                      </div>
                    )}
                    {consignment.warehouse_city && (
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-medium text-gray-900">{consignment.warehouse_city}</p>
                      </div>
                    )}
                    {consignment.warehouse_country && (
                      <div>
                        <p className="text-sm text-gray-600">Country</p>
                        <p className="font-medium text-gray-900">{consignment.warehouse_country}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client Information */}
              {client && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2 text-gray-600" />
                      Client Information
                    </h3>
                    <Link 
                      href={`/clients/${client.id}`}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Link>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{client.first_name} {client.last_name}</p>
                      {client.company_name && (
                        <p className="text-sm text-gray-600">{client.company_name}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{client.email || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">{client.phone_number || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getClientTypeColor(client)}`}>
                        {getClientTypeDisplay(client)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Palette className="h-5 w-5 mr-2 text-gray-600" />
                    Consigned Artworks ({items.length})
                  </h3>
                </div>
                
                {items.length > 0 ? (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          {/* Image section */}
                          <div className="flex-shrink-0 mr-4">
                            <MediaRenderer
                              src={item.images?.[0] || ''}
                              alt={item.title}
                              className="w-24 h-24 object-cover rounded border cursor-pointer"
                              aspectRatio="auto"
                              showControls={false}
                              onClick={() => router.push(`/items/${item.id}`)}
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{item.title}</h4>
                              {item.id && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  ID {item.id}
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {(item as any).artist_name && (
                                <div>
                                  <span className="text-gray-500">Artist:</span>
                                  <span className="ml-1 text-gray-900">{(item as any).artist_name}</span>
                                </div>
                              )}
                              {(item as any).school_name && (
                                <div>
                                  <span className="text-gray-500">School:</span>
                                  <span className="ml-1 text-gray-900">{(item as any).school_name}</span>
                                </div>
                              )}
                              {(item.height_inches || item.width_inches || item.height_cm || item.width_cm) && (
                                <div>
                                  <span className="text-gray-500">Size:</span>
                                  <span className="ml-1 text-gray-900">
                                    {item.height_inches && item.width_inches
                                      ? `${item.height_inches}" × ${item.width_inches}"`
                                      : item.height_cm && item.width_cm
                                      ? `${item.height_cm}cm × ${item.width_cm}cm`
                                      : item.height_inches
                                      ? `${item.height_inches}" (H)`
                                      : item.width_inches
                                      ? `${item.width_inches}" (W)`
                                      : item.height_cm
                                      ? `${item.height_cm}cm (H)`
                                      : `${item.width_cm}cm (W)`}
                                    {(item.height_with_frame_inches || item.width_with_frame_inches || item.height_with_frame_cm || item.width_with_frame_cm) && (
                                      <span className="ml-2 text-xs">
                                        (framed: {item.height_with_frame_inches && item.width_with_frame_inches
                                          ? `${item.height_with_frame_inches}" × ${item.width_with_frame_inches}"`
                                          : item.height_with_frame_cm && item.width_with_frame_cm
                                          ? `${item.height_with_frame_cm}cm × ${item.width_with_frame_cm}cm`
                                          : item.height_with_frame_inches
                                          ? `${item.height_with_frame_inches}" (H)`
                                          : item.width_with_frame_inches
                                          ? `${item.width_with_frame_inches}" (W)`
                                          : item.height_with_frame_cm
                                          ? `${item.height_with_frame_cm}cm (H)`
                                          : `${item.width_with_frame_cm}cm (W)`})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {item.condition && (
                                <div>
                                  <span className="text-gray-500">Condition:</span>
                                  <span className="ml-1 text-gray-900">{item.condition}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              £{(item.low_est || 0).toLocaleString()} - £{(item.high_est || 0).toLocaleString()}
                            </div>
                            {item.reserve && (
                              <div className="text-xs text-gray-500">
                                Reserve: £{(item.reserve || 0).toLocaleString()}
                              </div>
                            )}
                            {(item as any).sale_price && (
                              <div className="text-sm font-semibold text-green-600 mt-1">
                                Sold: £{((item as any).sale_price || 0).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Palette className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No items found for this consignment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
