// frontend/admin/src/app/xero/accounts/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroAccounts } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { Building2, AlertCircle, CheckCircle, XCircle, RefreshCw, DollarSign, Search, CreditCard, Filter, Settings } from 'lucide-react'

interface Account {
  accountID: string
  code: string
  name: string
  type: string
  class: string
  status: string
  description?: string
  taxType?: string
  enablePaymentsToAccount: boolean
  showInExpenseClaims: boolean
  currencyCode: string
  systemAccount?: string
  addToWatchlist: boolean
  bankAccountNumber?: string
  bankAccountType?: string
  hasAttachments: boolean
}

export default function XeroAccountsPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')

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
      fetchAccounts()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterAccounts()
  }, [accounts, searchTerm, selectedClass])

  const fetchAccounts = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroAccounts(selectedBrandId)
      
      if (response.success) {
        setAccounts(response.accounts || [])
      } else {
        setError('Failed to fetch accounts')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching accounts')
      console.error('Error fetching accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterAccounts = () => {
    let filtered = accounts

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(account => account.class === selectedClass)
    }

    setFilteredAccounts(filtered)
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

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bank':
        return 'bg-blue-100 text-blue-800'
      case 'current':
        return 'bg-green-100 text-green-800'
      case 'expense':
        return 'bg-red-100 text-red-800'
      case 'fixed':
        return 'bg-purple-100 text-purple-800'
      case 'inventory':
        return 'bg-orange-100 text-orange-800'
      case 'liability':
        return 'bg-pink-100 text-pink-800'
      case 'equity':
        return 'bg-indigo-100 text-indigo-800'
      case 'revenue':
        return 'bg-teal-100 text-teal-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const uniqueClasses = [...new Set(accounts.map(account => account.class))].sort()

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Chart of Accounts</h1>
            <p className="text-sm text-gray-500">View and manage your chart of accounts</p>
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
              onClick={fetchAccounts}
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
          {!loading && !error && filteredAccounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredAccounts.length}</div>
                    <div className="text-xs text-gray-600">Total Accounts</div>
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
                      {filteredAccounts.filter(a => a.status === 'Active').length}
                    </div>
                    <div className="text-xs text-gray-600">Active Accounts</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <CreditCard className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredAccounts.filter(a => a.enablePaymentsToAccount).length}
                    </div>
                    <div className="text-xs text-gray-600">Payment Accounts</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Filter className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredAccounts.length}</div>
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
                <CardTitle className="text-lg">Chart of Accounts</CardTitle>
                {/* Filters Row */}
                {!loading && !error && accounts.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Classes</option>
                      {uniqueClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
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
                  <span className="text-gray-600">Loading accounts...</span>
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

              {!loading && !error && accounts.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Accounts Found</h3>
                  <p className="text-xs text-gray-600">No accounts are available for this brand.</p>
                </div>
              )}

              {!loading && !error && filteredAccounts.length === 0 && accounts.length > 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Matching Accounts</h3>
                  <p className="text-xs text-gray-600">No accounts match your current filters.</p>
                </div>
              )}

              {!loading && !error && filteredAccounts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Code</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Class</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Features</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredAccounts.map((account) => (
                        <tr key={account.accountID} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-mono font-medium text-gray-900 text-sm">{account.code}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 text-sm">{account.name}</div>
                            {account.description && (
                              <div className="text-xs text-gray-500">{account.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs ${getTypeColor(account.type)}`}>
                              {account.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">
                              {account.class}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(account.status)}
                              <Badge className={`text-xs ${getStatusColor(account.status)}`}>
                                {account.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {account.enablePaymentsToAccount && (
                                <Badge variant="outline" className="text-xs">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Payments
                                </Badge>
                              )}
                              {account.showInExpenseClaims && (
                                <Badge variant="outline" className="text-xs">Expense Claims</Badge>
                              )}
                              {account.bankAccountNumber && (
                                <Badge variant="outline" className="text-xs">Bank Account</Badge>
                              )}
                              {account.hasAttachments && (
                                <Badge variant="outline" className="text-xs">Attachments</Badge>
                              )}
                              {account.systemAccount && (
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                                  System
                                </Badge>
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
