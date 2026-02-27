// frontend/admin/src/app/xero/bank-transactions/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroBankTransactions, getXeroAccounts } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { Banknote, AlertCircle, RefreshCw, Calendar, DollarSign, Building2, Search, Filter, CheckCircle } from 'lucide-react'

interface BankTransaction {
  bankTransactionID: string
  type: string
  status: string
  date: string
  reference?: string
  description?: string
  bankAccount: {
    accountID: string
    name: string
    code: string
  }
  contact?: {
    contactID: string
    name: string
  }
  lineItems: Array<{
    description: string
    unitAmount: number
    accountCode: string
    taxType: string
  }>
  subTotal: number
  totalTax: number
  total: number
  currencyCode: string
  isReconciled: boolean
  hasAttachments: boolean
}

interface BankAccount {
  accountID: string
  name: string
  code: string
  type: string
  bankAccountNumber?: string
}

export default function XeroBankTransactionsPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
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
      fetchBankAccounts()
      fetchBankTransactions()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterTransactions()
  }, [bankTransactions, searchTerm, selectedAccount, selectedStatus, selectedType])

  const fetchBankAccounts = async () => {
    if (!selectedBrandId) return

    try {
      const response = await getXeroAccounts(selectedBrandId)
      if (response.success) {
        const accounts = response.accounts.filter((account: any) => account.type === 'BANK')
        setBankAccounts(accounts)
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err)
    }
  }

  const fetchBankTransactions = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroBankTransactions(selectedBrandId, selectedAccount !== 'all' ? selectedAccount : undefined)
      
      if (response.success) {
        setBankTransactions(response.bankTransactions || [])
      } else {
        setError('Failed to fetch bank transactions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching bank transactions')
      console.error('Error fetching bank transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = bankTransactions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.bankAccount.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by account
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(transaction => transaction.bankAccount.accountID === selectedAccount)
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === selectedStatus)
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === selectedType)
    }

    setFilteredTransactions(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'authorised':
        return 'bg-green-100 text-green-800'
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
      case 'RECEIVE':
      case 'DEPOSIT':
        return 'bg-green-100 text-green-800'
      case 'SPEND':
      case 'WITHDRAWAL':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
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

  const uniqueStatuses = [...new Set(bankTransactions.map(transaction => transaction.status))].sort()
  const uniqueTypes = [...new Set(bankTransactions.map(transaction => transaction.type))].sort()

  const totalValue = filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0)
  const reconciledCount = filteredTransactions.filter(transaction => transaction.isReconciled).length

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Banknote className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Bank Transactions</h1>
            <p className="text-sm text-gray-500">Manage bank transactions from Xero</p>
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
              onClick={fetchBankTransactions}
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
          {!loading && !error && filteredTransactions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Banknote className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</div>
                    <div className="text-xs text-gray-600">Total Transactions</div>
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
                      {filteredTransactions.length > 0 ? formatCurrency(totalValue, filteredTransactions[0].currencyCode) : '$0'}
                    </div>
                    <div className="text-xs text-gray-600">Total Value</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{reconciledCount}</div>
                    <div className="text-xs text-gray-600">Reconciled</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{bankAccounts.length}</div>
                    <div className="text-xs text-gray-600">Bank Accounts</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Bank Transactions</CardTitle>
                {/* Filters Row */}
                {!loading && !error && bankTransactions.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Accounts</option>
                      {bankAccounts.map(account => (
                        <option key={account.accountID} value={account.accountID}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
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
                        <option key={type} value={type}>{type}</option>
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
                  <span className="text-gray-600">Loading bank transactions...</span>
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

              {!loading && !error && bankTransactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Banknote className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Bank Transactions Found</h3>
                  <p className="text-xs text-gray-600">No bank transactions are available for this brand.</p>
                </div>
              )}

              {!loading && !error && filteredTransactions.length === 0 && bankTransactions.length > 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Matching Transactions</h3>
                  <p className="text-xs text-gray-600">No transactions match your current filters.</p>
                </div>
              )}

              {!loading && !error && filteredTransactions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Reference</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Account</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.bankTransactionID} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{formatDate(transaction.date)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 text-sm">
                              {transaction.reference || 'No reference'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">
                              {transaction.description || transaction.lineItems[0]?.description || 'No description'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-blue-500" />
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{transaction.bankAccount.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{transaction.bankAccount.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">
                              {transaction.contact?.name || 'No contact'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs ${getTypeColor(transaction.type)}`}>
                              {transaction.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className={`font-mono font-medium text-sm ${transaction.total > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(transaction.total), transaction.currencyCode)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                                {transaction.status}
                              </Badge>
                              {transaction.isReconciled && (
                                <CheckCircle className="h-3 w-3 text-green-600" />
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
