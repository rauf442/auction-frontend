// frontend/admin/src/app/xero/tax-rates/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroTaxRates } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { Percent, AlertCircle, CheckCircle, XCircle, RefreshCw, Settings, Filter } from 'lucide-react'

interface TaxRate {
  taxRateID: string
  name: string
  taxType: string
  canApplyToAssets: boolean
  canApplyToEquity: boolean
  canApplyToExpenses: boolean
  canApplyToLiabilities: boolean
  canApplyToRevenue: boolean
  displayTaxRate: number
  effectiveRate: number
  status: string
  reportTaxType: string
}

export default function XeroTaxRatesPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
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
      fetchTaxRates()
    }
  }, [selectedBrandId])

  const fetchTaxRates = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroTaxRates(selectedBrandId)
      
      if (response.success) {
        setTaxRates(response.taxRates || [])
      } else {
        setError('Failed to fetch tax rates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching tax rates')
      console.error('Error fetching tax rates:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'archived':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getTaxTypeColor = (taxType: string) => {
    switch (taxType.toLowerCase()) {
      case 'input':
        return 'bg-blue-100 text-blue-800'
      case 'output':
        return 'bg-purple-100 text-purple-800'
      case 'capinput':
        return 'bg-indigo-100 text-indigo-800'
      case 'capoutput':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Percent className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Tax Rates</h1>
            <p className="text-sm text-gray-500">Manage and view tax rates</p>
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
              onClick={fetchTaxRates}
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
          {!loading && !error && taxRates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Percent className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{taxRates.length}</div>
                    <div className="text-xs text-gray-600">Total Tax Rates</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {taxRates.filter(t => t.status === 'Active').length}
                    </div>
                    <div className="text-xs text-gray-600">Active Rates</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Settings className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {taxRates.filter(t => t.canApplyToRevenue).length}
                    </div>
                    <div className="text-xs text-gray-600">Revenue Rates</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Filter className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{taxRates.length}</div>
                    <div className="text-xs text-gray-600">All Results</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tax Rates</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading tax rates...</span>
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

              {!loading && !error && taxRates.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Percent className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Tax Rates Found</h3>
                  <p className="text-xs text-gray-600">No tax rates are available for this brand.</p>
                </div>
              )}

              {!loading && !error && taxRates.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Applies To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {taxRates.map((taxRate) => (
                        <tr key={taxRate.taxRateID} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 text-sm">{taxRate.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs ${getTaxTypeColor(taxRate.taxType)}`}>
                              {taxRate.taxType}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono font-medium text-sm">
                              {taxRate.displayTaxRate}%
                            </div>
                            {taxRate.effectiveRate !== taxRate.displayTaxRate && (
                              <div className="text-xs text-gray-500 font-mono">
                                Effective: {taxRate.effectiveRate}%
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(taxRate.status)}
                              <Badge className={`text-xs ${getStatusColor(taxRate.status)}`}>
                                {taxRate.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {taxRate.canApplyToRevenue && (
                                <Badge variant="outline" className="text-xs">Revenue</Badge>
                              )}
                              {taxRate.canApplyToExpenses && (
                                <Badge variant="outline" className="text-xs">Expenses</Badge>
                              )}
                              {taxRate.canApplyToAssets && (
                                <Badge variant="outline" className="text-xs">Assets</Badge>
                              )}
                              {taxRate.canApplyToLiabilities && (
                                <Badge variant="outline" className="text-xs">Liabilities</Badge>
                              )}
                              {taxRate.canApplyToEquity && (
                                <Badge variant="outline" className="text-xs">Equity</Badge>
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
