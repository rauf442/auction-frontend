// frontend/admin/src/app/xero/history-notes/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroHistoryRecords, getXeroInvoices, getXeroAccounts } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { History, AlertCircle, RefreshCw, FileText, Building2, Search, Filter, Calendar, User } from 'lucide-react'

interface HistoryRecord {
  changedBy: string
  dateChange: string
  changes: string
  details: string
}

interface EntityWithHistory {
  id: string
  name: string
  type: 'invoice' | 'account'
  history: HistoryRecord[]
}

export default function XeroHistoryNotesPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [entitiesWithHistory, setEntitiesWithHistory] = useState<EntityWithHistory[]>([])
  const [filteredEntities, setFilteredEntities] = useState<EntityWithHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all')

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
      fetchAllHistory()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterEntities()
  }, [entitiesWithHistory, searchTerm, selectedEntityType])

  const fetchAllHistory = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      
      const entities: EntityWithHistory[] = []

      // Fetch invoice history
      try {
        const invoicesResponse = await getXeroInvoices(selectedBrandId)
        if (invoicesResponse.success) {
          const invoices = invoicesResponse.invoices?.slice(0, 20) || [] // Limit to first 20 for performance
          
          for (const invoice of invoices) {
            try {
              const historyResponse = await getXeroHistoryRecords(selectedBrandId, 'invoices', invoice.invoiceID)
              if (historyResponse.success && historyResponse.historyRecords?.length > 0) {
                entities.push({
                  id: invoice.invoiceID,
                  name: `Invoice ${invoice.invoiceNumber}`,
                  type: 'invoice',
                  history: historyResponse.historyRecords
                })
              }
            } catch (err) {
              console.warn(`Failed to fetch history for invoice ${invoice.invoiceID}:`, err)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch invoices:', err)
      }

      // Fetch account history
      try {
        const accountsResponse = await getXeroAccounts(selectedBrandId)
        if (accountsResponse.success) {
          const accounts = accountsResponse.accounts?.slice(0, 20) || [] // Limit to first 20 for performance
          
          for (const account of accounts) {
            try {
              const historyResponse = await getXeroHistoryRecords(selectedBrandId, 'accounts', account.accountID)
              if (historyResponse.success && historyResponse.historyRecords?.length > 0) {
                entities.push({
                  id: account.accountID,
                  name: `${account.name} (${account.code})`,
                  type: 'account',
                  history: historyResponse.historyRecords
                })
              }
            } catch (err) {
              console.warn(`Failed to fetch history for account ${account.accountID}:`, err)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch accounts:', err)
      }

      setEntitiesWithHistory(entities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching history records')
      console.error('Error fetching history records:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterEntities = () => {
    let filtered = entitiesWithHistory

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entity => 
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.history.some(record => 
          record.changes.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.changedBy.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Filter by entity type
    if (selectedEntityType !== 'all') {
      filtered = filtered.filter(entity => entity.type === selectedEntityType)
    }

    setFilteredEntities(filtered)
  }

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'account':
        return <Building2 className="h-4 w-4 text-green-500" />
      default:
        return <History className="h-4 w-4 text-gray-500" />
    }
  }

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800'
      case 'account':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getChangeTypeColor = (changes: string) => {
    if (changes.toLowerCase().includes('create')) return 'bg-green-100 text-green-800'
    if (changes.toLowerCase().includes('update') || changes.toLowerCase().includes('edit')) return 'bg-blue-100 text-blue-800'
    if (changes.toLowerCase().includes('delete') || changes.toLowerCase().includes('void')) return 'bg-red-100 text-red-800'
    if (changes.toLowerCase().includes('email') || changes.toLowerCase().includes('send')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const totalHistoryRecords = filteredEntities.reduce((sum, entity) => sum + entity.history.length, 0)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <History className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero History & Notes</h1>
            <p className="text-sm text-gray-500">View entity history and changes</p>
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
              onClick={fetchAllHistory}
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
          {!loading && !error && filteredEntities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredEntities.length}</div>
                    <div className="text-xs text-gray-600">Entities</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <History className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{totalHistoryRecords}</div>
                    <div className="text-xs text-gray-600">History Records</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredEntities.filter(e => e.history.some(h => h.changedBy)).length}
                    </div>
                    <div className="text-xs text-gray-600">Active Users</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Filter className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{filteredEntities.length}</div>
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
                <CardTitle className="text-lg">History & Notes</CardTitle>
                {/* Filters Row */}
                {!loading && !error && entitiesWithHistory.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search entities or changes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={selectedEntityType}
                      onChange={(e) => setSelectedEntityType(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="invoice">Invoices</option>
                      <option value="account">Accounts</option>
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading history records...</span>
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

              {!loading && !error && entitiesWithHistory.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <History className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No History Records Found</h3>
                  <p className="text-xs text-gray-600">No entities with history records are available for this brand.</p>
                  <p className="text-xs text-gray-500 mt-1">Only showing recent invoices and accounts for performance.</p>
                </div>
              )}

              {!loading && !error && filteredEntities.length === 0 && entitiesWithHistory.length > 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Matching Entities</h3>
                  <p className="text-xs text-gray-600">No entities match your current filters.</p>
                </div>
              )}

              {!loading && !error && filteredEntities.length > 0 && (
                <div className="space-y-4">
                  {filteredEntities.map((entity) => (
                    <div key={entity.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        {getEntityTypeIcon(entity.type)}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{entity.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${getEntityTypeColor(entity.type)}`}>
                              {entity.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {entity.history.length} history record{entity.history.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {entity.history
                          .sort((a, b) => new Date(b.dateChange).getTime() - new Date(a.dateChange).getTime())
                          .map((record, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <History className="h-4 w-4 text-gray-400 mt-0.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className={`text-xs ${getChangeTypeColor(record.changes)}`}>
                                    {record.changes}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(record.dateChange)}
                                  </div>
                                </div>
                                <div className="text-gray-900 text-sm mb-2">
                                  {record.details}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <User className="h-3 w-3" />
                                  <span>Changed by: {record.changedBy || 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}