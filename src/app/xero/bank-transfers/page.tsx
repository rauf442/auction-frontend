// frontend/admin/src/app/xero/bank-transfers/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroBankTransfers } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { ArrowLeftRight, AlertCircle, RefreshCw, Calendar, DollarSign, Building2, Filter, Paperclip } from 'lucide-react'

interface BankTransfer {
  bankTransferID: string
  date: string
  amount: number
  currencyCode: string
  fromBankAccount: {
    accountID: string
    name: string
    code: string
  }
  toBankAccount: {
    accountID: string
    name: string
    code: string
  }
  reference?: string
  hasAttachments: boolean
  createdDateUTC: string
}

export default function XeroBankTransfersPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      fetchBankTransfers()
    }
  }, [selectedBrandId])

  const fetchBankTransfers = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroBankTransfers(selectedBrandId)
      
      if (response.success) {
        setBankTransfers(response.bankTransfers || [])
      } else {
        setError('Failed to fetch bank transfers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching bank transfers')
      console.error('Error fetching bank transfers:', err)
    } finally {
      setLoading(false)
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

  const totalTransferValue = bankTransfers.reduce((sum, transfer) => sum + transfer.amount, 0)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Bank Transfers</h1>
            <p className="text-sm text-gray-500">View transfers between bank accounts</p>
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
              onClick={fetchBankTransfers}
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
          {!loading && !error && bankTransfers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{bankTransfers.length}</div>
                    <div className="text-xs text-gray-600">Total Transfers</div>
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
                      {bankTransfers.length > 0 ? formatCurrency(totalTransferValue, bankTransfers[0].currencyCode) : '$0'}
                    </div>
                    <div className="text-xs text-gray-600">Total Value</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Filter className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{bankTransfers.length}</div>
                    <div className="text-xs text-gray-600">All Results</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Bank Transfers</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading bank transfers...</span>
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

              {!loading && !error && bankTransfers.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <ArrowLeftRight className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Bank Transfers Found</h3>
                  <p className="text-xs text-gray-600">No bank transfers are available for this brand.</p>
                </div>
              )}

              {!loading && !error && bankTransfers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">From Account</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">To Account</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Reference</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bankTransfers.map((transfer) => (
                        <tr key={transfer.bankTransferID} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{formatDate(transfer.date)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-red-500" />
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{transfer.fromBankAccount.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{transfer.fromBankAccount.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-green-500" />
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{transfer.toBankAccount.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{transfer.toBankAccount.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-medium text-sm text-green-600">
                              {formatCurrency(transfer.amount, transfer.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">
                              {transfer.reference || 'No reference'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {transfer.hasAttachments && (
                                <Paperclip className="h-3 w-3 text-gray-400" />
                              )}
                              <div className="text-xs text-gray-500 font-mono">
                                ID: {transfer.bankTransferID.slice(-8)}
                              </div>
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

