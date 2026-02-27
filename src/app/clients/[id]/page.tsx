"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  fetchClient, 
  fetchClientOverview, 
  type Client, 
  formatClientDisplay, 
  getClientTypeDisplay, 
  getClientTypeColor 
} from '@/lib/clients-api'
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
  Tag,
  Clock,
  Activity,
  TrendingUp,
  Eye,
  Edit,
  Palette,
  Share2
} from 'lucide-react'
import ExportShareModal from '@/components/ExportShareModal'
import { useExportShare } from '@/hooks/useExportShare'
import { PhoneNumberUtils } from '@/lib/phone-number-utils'

interface ClientStats {
  totalPurchases: number
  totalSpent: number
  totalConsignments: number
  totalConsignmentValue: number
  totalItemsConsigned: number
  totalInvoices: number
  averageInvoiceValue: number
  lastActivity: string
}

interface BidderAnalytics {
  memberSince: string
  cardOnFile: boolean
  auctionsAttended: number
  bidsPlaced: number
  itemsWon: number
  taxExemption: boolean
  paymentRate: number
  avgHammerPriceLow: number
  avgHammerPriceHigh: number
  disputesOpen: number
  disputesClosed: number
  bidderNotes: string
}

export default function ClientViewPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = parseInt(params.id as string, 10)

  const [client, setClient] = useState<Client | null>(null)
  const [overview, setOverview] = useState<any>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [bidderAnalytics, setBidderAnalytics] = useState<BidderAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('admin') // In real app, get from auth context

  // Export/Share configuration
  const exportFields = [
    { key: 'first_name', label: 'First Name', selected: true, required: true },
    { key: 'last_name', label: 'Last Name', selected: true, required: true },
    { key: 'email', label: 'Email', selected: true },
    { key: 'phone_number', label: 'Phone Number', selected: true },
    { key: 'company_name', label: 'Company Name', selected: true },
    { key: 'client_type', label: 'Client Type', selected: true },
    { key: 'status', label: 'Status', selected: true },
    { key: 'billing_address1', label: 'Billing Address', selected: false },
    { key: 'billing_city', label: 'Billing City', selected: false },
    { key: 'billing_country', label: 'Billing Country', selected: false },
    { key: 'shipping_address1', label: 'Shipping Address', selected: false },
    { key: 'vat_number', label: 'VAT Number', selected: false },
    { key: 'paddle_no', label: 'Paddle Number', selected: false },
    { key: 'platform', label: 'Platform', selected: false },
    { key: 'created_at', label: 'Created Date', selected: false },
    // Bidder Analytics fields
    { key: 'card_on_file', label: 'Card on File', selected: false },
    { key: 'auctions_attended', label: 'Auctions Attended', selected: false },
    { key: 'bids_placed', label: 'Bids Placed', selected: false },
    { key: 'items_won', label: 'Items Won', selected: false },
    { key: 'tax_exemption', label: 'Tax Exemption', selected: false },
    { key: 'payment_rate', label: 'Payment Rate', selected: false },
    { key: 'avg_hammer_price_range', label: 'Avg Hammer Price Range', selected: false },
    { key: 'disputes_total', label: 'Dispute History', selected: false },
    { key: 'bidder_notes', label: 'Bidder Notes', selected: false },
  ]

  const exportShare = useExportShare({
    title: `Client Profile - ${client?.first_name} ${client?.last_name}`,
    data: client || {},
    fields: exportFields,
    filename: `client-${client?.first_name?.toLowerCase()}-${client?.last_name?.toLowerCase()}-${Date.now()}`,
    userRole: userRole
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [clientResp, overviewResp] = await Promise.all([
          fetchClient(clientId),
          fetchClientOverview(clientId)
        ])
        setClient(clientResp.data)
        setOverview(overviewResp.data)
        
        // Calculate stats from overview data
        const purchases = overviewResp.data.purchases || []
        const consignments = overviewResp.data.consignments || []
        const invoices = overviewResp.data.invoices || []
        
        const calculatedStats: ClientStats = {
          totalPurchases: purchases.length,
          totalSpent: purchases.reduce((sum: number, p: any) => {
            // Use the actual final sale price if available, otherwise estimate from high_est
            const price = p.sale_price || p.final_price || p.high_est || 0
            return sum + price
          }, 0),
          totalConsignments: consignments.length,
          totalConsignmentValue: consignments.reduce((sum: number, c: any) => sum + (c.total_estimated_value || 0), 0),
          totalItemsConsigned: consignments.reduce((sum: number, c: any) => sum + (c.items_count || 0), 0),
          totalInvoices: invoices.length,
          averageInvoiceValue: (() => {
            if (!invoices.length) return 0;
            const validInvoices = invoices.filter((i: any) => {
              const total = i.total_amount || i.amount || i.total;
              return total && total > 0;
            });
            if (!validInvoices.length) return 0;
            const total = validInvoices.reduce((sum: number, i: any) => {
              const amount = i.total_amount || i.amount || i.total || 0;
              return sum + amount;
            }, 0);
            return total / validInvoices.length;
          })(),
          lastActivity: getLastActivity([...purchases, ...consignments, ...invoices])
        }
        
        setStats(calculatedStats)

        // Set bidder analytics
        const clientData = clientResp.data
        setBidderAnalytics({
          memberSince: clientData.created_at ? new Date(clientData.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'Unknown',
          cardOnFile: clientData.card_on_file || false,
          auctionsAttended: clientData.auctions_attended || 0,
          bidsPlaced: clientData.bids_placed || 0,
          itemsWon: clientData.items_won || 0,
          taxExemption: clientData.tax_exemption || false,
          paymentRate: clientData.payment_rate || 0,
          avgHammerPriceLow: clientData.avg_hammer_price_low || 0,
          avgHammerPriceHigh: clientData.avg_hammer_price_high || 0,
          disputesOpen: clientData.disputes_open || 0,
          disputesClosed: clientData.disputes_closed || 0,
          bidderNotes: clientData.bidder_notes || ''
        })
      } catch (err: any) {
        setError(err?.message || 'Failed to load client')
      } finally {
        setLoading(false)
      }
    }
    if (clientId) load()
  }, [clientId])

  const getLastActivity = (activities: any[]) => {
    if (!activities.length) return 'No activity'
    const sorted = activities.sort((a, b) => new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime())
    return new Date(sorted[0].created_at || sorted[0].updated_at).toLocaleDateString()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading client information...</p>
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
  
  if (!client) return null

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-slate-200 text-sm">{formatClientDisplay(client)}</span>
                {client.company_name && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-200 text-sm">{client.company_name}</span>
                  </>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getClientTypeColor(client)}`}>
                  {getClientTypeDisplay(client)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {userRole === 'super_admin' && (
              <button
                onClick={exportShare.openModal}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Export & Share</span>
              </button>
            )}
            <Link 
              href={`/clients/edit/${clientId}`} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Client</span>
            </Link>
            <Link 
              href="/clients" 
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-black px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Back to Clients
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-3 mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">£{stats.totalSpent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{stats.totalPurchases} purchases</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Consignment Value</p>
                    <p className="text-2xl font-bold text-gray-900">£{stats.totalConsignmentValue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{stats.totalItemsConsigned} items consigned</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 rounded-full p-3 mr-4">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Invoice</p>
                    <p className="text-2xl font-bold text-gray-900">£{stats.averageInvoiceValue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{stats.totalInvoices} invoices</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-orange-100 rounded-full p-3 mr-4">
                    <Activity className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Activity</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.lastActivity}</p>
                    <p className="text-xs text-gray-500">Recent engagement</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Client Details */}
            <div className="lg:col-span-1 space-y-8">
              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-600" />
                  Contact Information
                </h3>
                <div className="space-y-4">
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
                      <div className="flex items-center gap-2">
                        {client.phone_number && (
                          <>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {PhoneNumberUtils.getCountryCode(client.phone_number) || 'UNK'}
                            </span>
                            <span className="font-medium text-gray-900">
                              {client.phone_number.startsWith('+') ? client.phone_number : `+${client.phone_number}`}
                            </span>
                          </>
                        )}
                        {!client.phone_number && (
                          <p className="font-medium text-gray-900">Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {client.secondary_email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Secondary Email</p>
                        <p className="font-medium text-gray-900">{client.secondary_email}</p>
                      </div>
                    </div>
                  )}
                  {client.secondary_phone_number && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Secondary Phone</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {PhoneNumberUtils.getCountryCode(client.secondary_phone_number) || 'UNK'}
                          </span>
                          <span className="font-medium text-gray-900">
                            {client.secondary_phone_number.startsWith('+') ? client.secondary_phone_number : `+${client.secondary_phone_number}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Configuration */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-gray-600" />
                  Client Configuration
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client Type</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getClientTypeColor(client)}`}>
                        {getClientTypeDisplay(client)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</p>
                      <p className="text-sm text-gray-700 mt-1">{client.platform || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Buyer's Premium</p>
                      {client.buyer_premium !== undefined && client.buyer_premium !== null ? (
                        <p className="text-sm text-gray-700 mt-1">{client.buyer_premium}%</p>
                      ) : (
                        <p className="text-gray-400 italic text-sm mt-1">Not set</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor's Premium</p>
                      {client.vendor_premium !== undefined && client.vendor_premium !== null ? (
                        <p className="text-sm text-gray-700 mt-1">{client.vendor_premium}%</p>
                      ) : (
                        <p className="text-gray-400 italic text-sm mt-1">Not set</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">VAT Number</p>
                      <p className="text-sm text-gray-700 mt-1">{client.vat_number || 'Not applicable'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paddle Number</p>
                      <p className="text-sm text-gray-700 mt-1">{client.paddle_no || 'Not assigned'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      client.status === 'active' ? 'bg-green-100 text-green-800' :
                      client.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status || 'active'}
                    </span>
                  </div>

                  {client.tags && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</p>
                      <p className="text-sm text-gray-700 mt-1">{client.tags}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bidder Analytics */}
              {bidderAnalytics && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-gray-600" />
                    Bidder Analytics
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium text-gray-900">{bidderAnalytics.memberSince}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Card on File</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bidderAnalytics.cardOnFile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {bidderAnalytics.cardOnFile ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tax Exemption</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bidderAnalytics.taxExemption ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bidderAnalytics.taxExemption ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Auctions Attended</p>
                        <p className="font-medium text-gray-900">{bidderAnalytics.auctionsAttended}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bids Placed</p>
                        <p className="font-medium text-gray-900">{bidderAnalytics.bidsPlaced}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Items Won</p>
                        <p className="font-medium text-gray-900">{bidderAnalytics.itemsWon}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Rate</p>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(bidderAnalytics.paymentRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-gray-900">{bidderAnalytics.paymentRate}%</span>
                      </div>
                    </div>
                    {(bidderAnalytics.avgHammerPriceLow > 0 || bidderAnalytics.avgHammerPriceHigh > 0) && (
                      <div>
                        <p className="text-sm text-gray-600">Avg Hammer Price Range</p>
                        <p className="font-medium text-gray-900">
                          £{bidderAnalytics.avgHammerPriceLow.toLocaleString()} - £{bidderAnalytics.avgHammerPriceHigh.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Dispute History</p>
                      <p className="font-medium text-gray-900">
                        {bidderAnalytics.disputesOpen} open, {bidderAnalytics.disputesClosed} closed
                      </p>
                    </div>
                    {bidderAnalytics.bidderNotes && (
                      <div>
                        <p className="text-sm text-gray-600">Bidder Notes</p>
                        <p className="font-medium text-gray-900 text-sm bg-gray-50 p-2 rounded">{bidderAnalytics.bidderNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-gray-600" />
                  Bank Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Details</p>
                    <div className="mt-1">
                      {client.bank_account_details ? (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.bank_account_details}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No bank account details provided</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Address</p>
                    <div className="mt-1">
                      {client.bank_address ? (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.bank_address}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No bank address provided</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-gray-600" />
                  Addresses
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                      Billing Address
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-700 space-y-1">
                        {client.billing_address1 && <p className="font-medium">{client.billing_address1}</p>}
                        {client.billing_address2 && <p>{client.billing_address2}</p>}
                        {client.billing_address3 && <p>{client.billing_address3}</p>}
                        {(client.billing_city || client.billing_post_code) && (
                          <p className="text-gray-600">{[client.billing_city, client.billing_post_code].filter(Boolean).join(', ')}</p>
                        )}
                        {(client.billing_region || client.billing_country) && (
                          <p className="text-gray-600">{[client.billing_region, client.billing_country].filter(Boolean).join(', ')}</p>
                        )}
                        {!client.billing_address1 && <p className="text-gray-400 italic">No billing address provided</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      Shipping Address
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-700 space-y-1">
                        {client.shipping_same_as_billing ? (
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            <p className="text-gray-600 italic">Same as billing address</p>
                          </div>
                        ) : (
                          <>
                            {client.shipping_address1 && <p className="font-medium">{client.shipping_address1}</p>}
                            {client.shipping_address2 && <p>{client.shipping_address2}</p>}
                            {client.shipping_address3 && <p>{client.shipping_address3}</p>}
                            {(client.shipping_city || client.shipping_post_code) && (
                              <p className="text-gray-600">{[client.shipping_city, client.shipping_post_code].filter(Boolean).join(', ')}</p>
                            )}
                            {(client.shipping_region || client.shipping_country) && (
                              <p className="text-gray-600">{[client.shipping_region, client.shipping_country].filter(Boolean).join(', ')}</p>
                            )}
                            {!client.shipping_address1 && <p className="text-gray-400 italic">No shipping address provided</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Activity & Relationships */}
            <div className="lg:col-span-2 space-y-8">
              {/* Activity Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Purchases */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                      Recent Purchases
                    </h3>
                    <Link
                      href={`/items?buyer_id=${clientId}`}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View All
                    </Link>
                  </div>
                  {overview?.purchases?.length ? (
                    <div className="space-y-3">
                      {overview.purchases.slice(0, 5).map((purchase: any) => (
                        <div key={purchase.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{purchase.title || `Lot #${purchase.lot_num || purchase.id}`}</p>
                            <p className="text-xs text-gray-500">{purchase.created_at ? new Date(purchase.created_at).toLocaleDateString() : ''}</p>
                            {purchase.category && (
                              <p className="text-xs text-gray-400">{purchase.category}</p>
                            )}
                          </div>
                          {(purchase.sale_price || purchase.final_price || purchase.high_est) && (
                            <span className="text-sm font-medium text-green-600">
                              £{(purchase.sale_price || purchase.final_price || purchase.high_est).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Palette className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No purchases yet</p>
                    </div>
                  )}
                </div>

                {/* Consignments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-blue-600" />
                      Consignments
                    </h3>
                    <Link
                      href={`/consignments?client_id=${clientId}`}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View All
                    </Link>
                  </div>
                  {overview?.consignments?.length ? (
                    <div className="space-y-3">
                      {overview.consignments.slice(0, 5).map((consignment: any) => (
                        <Link
                          key={consignment.id}
                          href={`/consignments/view/${consignment.id}`}
                          className="block"
                        >
                          <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm hover:text-blue-600">
                                {consignment.consignment_number || `Consignment #${consignment.id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {consignment.created_at ? new Date(consignment.created_at).toLocaleDateString() : ''}
                              </p>
                              <p className="text-xs text-gray-600">
                                {consignment.items_count || 0} items
                              </p>
                            </div>
                            {consignment.total_estimated_value && (
                              <span className="text-sm font-medium text-blue-600">
                                £{consignment.total_estimated_value.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No consignments yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoices */}
              <div className="grid grid-cols-1 gap-8">
                {/* Invoices */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-purple-600" />
                      Invoices
                    </h3>
                    <Link 
                      href={`/invoices?client_id=${clientId}`} 
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View All
                    </Link>
                  </div>
                  {overview?.invoices?.length ? (
                    <div className="space-y-3">
                      {overview.invoices.slice(0, 5).map((invoice: any) => (
                        <Link
                          key={invoice.id}
                          href={`/invoices/${invoice.id}?from=clients`}
                          className="block"
                        >
                          <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm hover:text-blue-600">
                                {invoice.invoice_number || `Invoice #${invoice.id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : ''}
                              </p>
                              {invoice.status && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {invoice.status}
                                </span>
                              )}
                            </div>
                            {(invoice.total_amount || invoice.amount || invoice.total) && (
                              <span className="text-sm font-medium text-purple-600">
                                £{(invoice.total_amount || invoice.amount || invoice.total).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No invoices yet</p>
                    </div>
                  )}
                </div>


              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export/Share Modal */}
      <ExportShareModal
        isOpen={exportShare.isModalOpen}
        onClose={exportShare.closeModal}
        title={exportShare.config.title}
        data={exportShare.config.data}
        availableFields={exportShare.config.fields}
        onExport={exportShare.handleExport}
        onPrint={exportShare.handlePrint}
        onShare={exportShare.handleShare}
        userRole={userRole}
      />
    </div>
  )
}


