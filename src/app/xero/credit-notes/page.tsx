// frontend/admin/src/app/xero/credit-notes/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroCreditNotes } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { RefreshCcw, AlertCircle, RefreshCw, Calendar, DollarSign, User, Search, Filter, Paperclip, Send } from 'lucide-react'

interface CreditNote {
  creditNoteID: string
  creditNoteNumber: string
  reference?: string
  type: string
  contact: {
    contactID: string
    name: string
  }
  date: string
  status: string
  lineAmountTypes: string
  subTotal: number
  totalTax: number
  total: number
  totalDiscount?: number
  allocatedAmount: number
  remainingCredit: number
  currencyCode: string
  fullyPaidOnDate?: string
  hasAttachments: boolean
  hasErrors: boolean
  sentToContact: boolean
  appliedAmount?: number
}

export default function XeroCreditNotesPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>([])
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
      fetchCreditNotes()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterCreditNotes()
  }, [creditNotes, searchTerm, selectedStatus, selectedType])

  const fetchCreditNotes = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroCreditNotes(selectedBrandId)
      
      if (response.success) {
        setCreditNotes(response.creditNotes || [])
      } else {
        setError('Failed to fetch credit notes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching credit notes')
      console.error('Error fetching credit notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterCreditNotes = () => {
    let filtered = creditNotes

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(creditNote => 
        creditNote.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creditNote.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creditNote.contact.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(creditNote => creditNote.status === selectedStatus)
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(creditNote => creditNote.type === selectedType)
    }

    setFilteredCreditNotes(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'authorised':
        return 'bg-green-100 text-green-800'
      case 'paid':
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
      case 'ACCPAYCREDIT':
        return 'bg-red-100 text-red-800'
      case 'ACCRECCREDIT':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ACCPAYCREDIT':
        return 'Purchase Credit Note'
      case 'ACCRECCREDIT':
        return 'Sales Credit Note'
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

  const uniqueStatuses = [...new Set(creditNotes.map(creditNote => creditNote.status))].sort()
  const uniqueTypes = [...new Set(creditNotes.map(creditNote => creditNote.type))].sort()

  const totalCreditValue = filteredCreditNotes.reduce((sum, creditNote) => sum + creditNote.total, 0)
  const totalRemainingCredit = filteredCreditNotes.reduce((sum, creditNote) => sum + creditNote.remainingCredit, 0)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <RefreshCcw className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Credit Notes</h1>
            <p className="text-sm text-gray-500">Manage and view credit notes</p>
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
              onClick={fetchCreditNotes}
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
          {!loading && !error && filteredCreditNotes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <RefreshCcw className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredCreditNotes.length}</div>
                    <div className="text-xs text-gray-600">Total Credit Notes</div>
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
                      {filteredCreditNotes.length > 0 ? formatCurrency(totalCreditValue, filteredCreditNotes[0].currencyCode) : '$0'}
                    </div>
                    <div className="text-xs text-gray-600">Total Credit Value</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <RefreshCcw className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredCreditNotes.length > 0 ? formatCurrency(totalRemainingCredit, filteredCreditNotes[0].currencyCode) : '$0'}
                    </div>
                    <div className="text-xs text-gray-600">Remaining Credit</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Filter className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredCreditNotes.length}</div>
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
                <CardTitle className="text-lg">Credit Notes</CardTitle>
                {/* Filters Row */}
                {!loading && !error && creditNotes.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search credit notes..."
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
                  <span className="text-gray-600">Loading credit notes...</span>
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

              {!loading && !error && creditNotes.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <RefreshCcw className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Credit Notes Found</h3>
                  <p className="text-xs text-gray-600">No credit notes are available for this brand.</p>
                </div>
              )}

              {!loading && !error && filteredCreditNotes.length === 0 && creditNotes.length > 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Matching Credit Notes</h3>
                  <p className="text-xs text-gray-600">No credit notes match your current filters.</p>
                </div>
              )}

              {!loading && !error && filteredCreditNotes.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Credit Note</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Allocated</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Remaining</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCreditNotes.map((creditNote) => (
                        <tr key={creditNote.creditNoteID} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 text-sm">{creditNote.creditNoteNumber}</div>
                            {creditNote.reference && (
                              <div className="text-xs text-gray-500">{creditNote.reference}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{creditNote.contact.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs ${getTypeColor(creditNote.type)}`}>
                              {getTypeLabel(creditNote.type)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs">{formatDate(creditNote.date)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-medium text-sm">
                              {formatCurrency(creditNote.total, creditNote.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-medium text-sm text-blue-600">
                              {formatCurrency(creditNote.allocatedAmount || 0, creditNote.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-medium text-sm text-green-600">
                              {formatCurrency(creditNote.remainingCredit, creditNote.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`text-xs ${getStatusColor(creditNote.status)}`}>
                                {creditNote.status}
                              </Badge>
                              {creditNote.hasAttachments && (
                                <Paperclip className="h-3 w-3 text-gray-400" />
                              )}
                              {creditNote.sentToContact && (
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
