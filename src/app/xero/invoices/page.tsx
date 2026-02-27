// frontend/admin/src/app/xero/invoices/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroInvoices } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { FileText, AlertCircle, RefreshCw, Search, Calendar, DollarSign, User, Filter, Paperclip, Send, Eye } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

interface Invoice {
  invoiceID: string
  invoiceNumber: string
  reference?: string
  type: string
  contact: {
    contactID: string
    name: string
  }
  date: string
  dueDate: string
  status: string
  lineAmountTypes: string
  subTotal: number
  totalTax: number
  total: number
  totalDiscount?: number
  amountDue: number
  amountPaid: number
  amountCredited?: number
  currencyCode: string
  fullyPaidOnDate?: string
  hasAttachments: boolean
  hasErrors: boolean
  sentToContact: boolean
  repeatingInvoiceID?: string
}

export default function XeroInvoicesPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Load brands on component mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await getBrands()
        if (response.success && response.data) {
          setBrands(response.data)
        }
      } catch (err) {
        console.error('Error loading brands:', err)
      }
    }
    loadBrands()
  }, [])

  useEffect(() => {
    if (selectedBrandId) {
      fetchInvoices()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm, selectedStatus, selectedType])

  const fetchInvoices = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroInvoices(selectedBrandId, undefined, 'Date DESC')
      
      if (response.success) {
        setInvoices(response.invoices || [])
      } else {
        setError('Failed to fetch invoices')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.contact.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus)
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(invoice => invoice.type === selectedType)
    }

    setFilteredInvoices(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'authorised':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      case 'voided':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ACCREC':
        return 'bg-blue-100 text-blue-800'
      case 'ACCPAY':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ACCREC':
        return 'Sales Invoice'
      case 'ACCPAY':
        return 'Purchase Invoice'
      default:
        return type
    }
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const uniqueStatuses = [...new Set(invoices.map(invoice => invoice.status))].sort()
  const uniqueTypes = [...new Set(invoices.map(invoice => invoice.type))].sort()

  const totalInvoiceValue = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0)
  const totalOutstanding = filteredInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Invoices</h1>
            <p className="text-sm text-gray-500">Manage and view invoices from Xero</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedBrandId && (
            <XeroConnectButton
              brandId={selectedBrandId}
              brandName={brands.find(b => b.id.toString() === selectedBrandId)?.name || ''}
              selectedBrand={brands.find(b => b.id.toString() === selectedBrandId)?.code || ''}
              variant="compact"
            />
          )}
          {selectedBrandId && (
            <Button
              onClick={fetchInvoices}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Brand Selector */}
      <div className="mb-6">
        <BrandSelector
          selectedBrandId={selectedBrandId}
          onBrandSelect={setSelectedBrandId}
        />
      </div>

      {selectedBrandId && (
        <>
          {/* Summary Stats */}
          {selectedBrandId && !loading && !error && filteredInvoices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
                    <div className="text-xs text-gray-600">Total Invoices</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredInvoices.length > 0 ? formatCurrency(totalInvoiceValue, filteredInvoices[0].currencyCode) : '$0'}
                    </div>
                    <div className="text-xs text-gray-600">Total Value</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredInvoices.length > 0 ? formatCurrency(totalOutstanding, filteredInvoices[0].currencyCode) : '$0'}
                    </div>
                    <div className="text-xs text-gray-600">Outstanding</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Filter className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
                    <div className="text-xs text-gray-600">Filtered Results</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Invoices</CardTitle>
                {/* Filters Row */}
                {!loading && !error && invoices.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Statuses</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>{getTypeLabel(type)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading invoices...</span>
                </div>
              )}

              {error && (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {!loading && !error && invoices.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Invoices Found</h3>
                  <p className="text-xs text-gray-600">No invoices are available for this brand.</p>
                </div>
              )}

              {!loading && !error && filteredInvoices.length === 0 && invoices.length > 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Matching Invoices</h3>
                  <p className="text-xs text-gray-600">No invoices match your current filters.</p>
                </div>
              )}

              {!loading && !error && filteredInvoices.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Due</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Due</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.invoiceID} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 text-sm">{invoice.invoiceNumber}</div>
                            {invoice.reference && (
                              <div className="text-xs text-gray-500">{invoice.reference}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{invoice.contact.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs ${getTypeColor(invoice.type)}`}>
                              {getTypeLabel(invoice.type)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs">{formatDate(invoice.date)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs">{formatDate(invoice.dueDate)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-medium text-sm">
                              {formatCurrency(invoice.total, invoice.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className={`font-mono font-medium text-sm ${invoice.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(invoice.amountDue, invoice.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`text-xs ${getStatusColor(invoice.status)}`}>
                                {invoice.status}
                              </Badge>
                              {invoice.hasAttachments && (
                                <Paperclip className="h-3 w-3 text-gray-400" />
                              )}
                              {invoice.sentToContact && (
                                <Send className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
