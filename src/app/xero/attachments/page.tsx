// frontend/admin/src/app/xero/attachments/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroAttachments, getXeroInvoices, getXeroAccounts } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { Paperclip, AlertCircle, RefreshCw, FileText, Building2, Search, Filter, Download, Eye } from 'lucide-react'

interface Attachment {
  attachmentID: string
  fileName: string
  url: string
  mimeType: string
  contentLength: number
  includeOnline: boolean
}

interface EntityWithAttachments {
  id: string
  name: string
  type: 'invoice' | 'account'
  attachments: Attachment[]
}

export default function XeroAttachmentsPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [entitiesWithAttachments, setEntitiesWithAttachments] = useState<EntityWithAttachments[]>([])
  const [filteredEntities, setFilteredEntities] = useState<EntityWithAttachments[]>([])
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
      fetchAllAttachments()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterEntities()
  }, [entitiesWithAttachments, searchTerm, selectedEntityType])

  const fetchAllAttachments = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      
      const entities: EntityWithAttachments[] = []

      // Fetch invoices with attachments
      try {
        const invoicesResponse = await getXeroInvoices(selectedBrandId)
        if (invoicesResponse.success) {
          const invoicesWithAttachments = invoicesResponse.invoices?.filter((invoice: any) => invoice.hasAttachments) || []
          
          for (const invoice of invoicesWithAttachments) {
            try {
              const attachmentsResponse = await getXeroAttachments(selectedBrandId, 'invoices', invoice.invoiceID)
              if (attachmentsResponse.success && attachmentsResponse.attachments?.length > 0) {
                entities.push({
                  id: invoice.invoiceID,
                  name: `Invoice ${invoice.invoiceNumber}`,
                  type: 'invoice',
                  attachments: attachmentsResponse.attachments
                })
              }
            } catch (err) {
              console.warn(`Failed to fetch attachments for invoice ${invoice.invoiceID}:`, err)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch invoices:', err)
      }

      // Fetch accounts with attachments
      try {
        const accountsResponse = await getXeroAccounts(selectedBrandId)
        if (accountsResponse.success) {
          const accountsWithAttachments = accountsResponse.accounts?.filter((account: any) => account.hasAttachments) || []
          
          for (const account of accountsWithAttachments) {
            try {
              const attachmentsResponse = await getXeroAttachments(selectedBrandId, 'accounts', account.accountID)
              if (attachmentsResponse.success && attachmentsResponse.attachments?.length > 0) {
                entities.push({
                  id: account.accountID,
                  name: `${account.name} (${account.code})`,
                  type: 'account',
                  attachments: attachmentsResponse.attachments
                })
              }
            } catch (err) {
              console.warn(`Failed to fetch attachments for account ${account.accountID}:`, err)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch accounts:', err)
      }

      setEntitiesWithAttachments(entities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching attachments')
      console.error('Error fetching attachments:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterEntities = () => {
    let filtered = entitiesWithAttachments

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entity => 
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.attachments.some(attachment => 
          attachment.fileName.toLowerCase().includes(searchTerm.toLowerCase())
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
        return <Paperclip className="h-4 w-4 text-gray-500" />
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.includes('image/')) return '🖼️'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('text/')) return '📄'
    return '📎'
  }

  const totalAttachments = filteredEntities.reduce((sum, entity) => sum + entity.attachments.length, 0)
  const totalSize = filteredEntities.reduce((sum, entity) => 
    sum + entity.attachments.reduce((attachSum, attachment) => attachSum + attachment.contentLength, 0), 0
  )

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Paperclip className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Xero Attachments</h1>
            <p className="text-sm text-gray-500">Manage attachments for entities</p>
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
              onClick={fetchAllAttachments}
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
                    <Paperclip className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{totalAttachments}</div>
                    <div className="text-xs text-gray-600">Attachments</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Download className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</div>
                    <div className="text-xs text-gray-600">Total Size</div>
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
                <CardTitle className="text-lg">Attachments</CardTitle>
                {/* Filters Row */}
                {!loading && !error && entitiesWithAttachments.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search entities or files..."
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
                  <span className="text-gray-600">Loading attachments...</span>
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

              {!loading && !error && entitiesWithAttachments.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-3 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                    <Paperclip className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Attachments Found</h3>
                  <p className="text-xs text-gray-600">No entities with attachments are available for this brand.</p>
                </div>
              )}

              {!loading && !error && filteredEntities.length === 0 && entitiesWithAttachments.length > 0 && (
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
                              {entity.attachments.length} attachment{entity.attachments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {entity.attachments.map((attachment) => (
                          <div key={attachment.attachmentID} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="text-xl flex-shrink-0">{getMimeTypeIcon(attachment.mimeType)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate mb-1">{attachment.fileName}</div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {formatFileSize(attachment.contentLength)}
                                </div>
                                <div className="text-xs text-gray-400 font-mono mb-2 truncate">
                                  {attachment.mimeType}
                                </div>
                                <div className="flex items-center gap-3">
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                  <a
                                    href={attachment.url}
                                    download={attachment.fileName}
                                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                                  >
                                    <Download className="h-3 w-3" />
                                    Download
                                  </a>
                                  {attachment.includeOnline && (
                                    <Badge variant="outline" className="text-xs">Online</Badge>
                                  )}
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

