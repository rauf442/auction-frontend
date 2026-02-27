// frontend/admin/src/app/xero/types-codes/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import BrandSelector from '@/components/xero/BrandSelector'
import { getXeroTrackingCategories, getXeroOrganisation, getXeroCurrencies } from '@/lib/xero-payments-api'
import { Tag, AlertCircle, RefreshCw, Building2, DollarSign, Search, Filter, Plus, Eye } from 'lucide-react'

interface TrackingCategory {
  trackingCategoryID: string
  name: string
  status: string
  options: TrackingOption[]
}

interface TrackingOption {
  trackingOptionID: string
  name: string
  status: string
}

interface Organisation {
  organisationID: string
  name: string
  version: string
  organisationType: string
  baseCurrency: string
  countryCode: string
  taxNumber?: string
}

interface Currency {
  code: string
  description: string
}

export default function XeroTypesCodesPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [trackingCategories, setTrackingCategories] = useState<TrackingCategory[]>([])
  const [organisation, setOrganisation] = useState<Organisation | null>(null)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [filteredCategories, setFilteredCategories] = useState<TrackingCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'tracking' | 'organisation' | 'currencies'>('tracking')

  useEffect(() => {
    if (selectedBrandId) {
      fetchData()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterCategories()
  }, [trackingCategories, searchTerm, selectedStatus])

  const fetchData = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      
      // Fetch tracking categories
      const trackingResponse = await getXeroTrackingCategories(selectedBrandId)
      if (trackingResponse.success) {
        setTrackingCategories(trackingResponse.trackingCategories || [])
      }

      // Fetch organisation info
      try {
        const orgResponse = await getXeroOrganisation(selectedBrandId)
        if (orgResponse.success && orgResponse.organisations?.length > 0) {
          setOrganisation(orgResponse.organisations[0])
        }
      } catch (err) {
        console.warn('Failed to fetch organisation:', err)
      }

      // Fetch currencies
      try {
        const currencyResponse = await getXeroCurrencies(selectedBrandId)
        if (currencyResponse.success) {
          setCurrencies(currencyResponse.currencies || [])
        }
      } catch (err) {
        console.warn('Failed to fetch currencies:', err)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterCategories = () => {
    let filtered = trackingCategories

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.options.some(option => 
          option.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(category => category.status === selectedStatus)
    }

    setFilteredCategories(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const uniqueStatuses = [...new Set(trackingCategories.map(category => category.status))].sort()
  const totalOptions = filteredCategories.reduce((sum, category) => sum + category.options.length, 0)

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Tag className="h-8 w-8 text-blue-600" />
          Xero Types & Codes
        </h1>
        <p className="text-gray-600">Manage tracking categories, types, and coding structures in your Xero account</p>
      </div>

      <div className="grid gap-6">
        {/* Brand Selector */}
        <BrandSelector
          selectedBrandId={selectedBrandId}
          onBrandSelect={setSelectedBrandId}
        />

        {/* Tab Navigation */}
        {selectedBrandId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'tracking'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Tag className="h-4 w-4 inline mr-2" />
                    Tracking Categories
                  </button>
                  <button
                    onClick={() => setActiveTab('organisation')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'organisation'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Organisation Info
                  </button>
                  <button
                    onClick={() => setActiveTab('currencies')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'currencies'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Currencies
                  </button>
                </div>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Summary Cards for Tracking Categories */}
        {selectedBrandId && activeTab === 'tracking' && !loading && !error && filteredCategories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Tag className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Total Categories</div>
                    <div className="text-2xl font-bold text-gray-900">{filteredCategories.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Plus className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-600">Total Options</div>
                    <div className="text-2xl font-bold text-gray-900">{totalOptions}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-sm text-gray-600">Active Categories</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredCategories.filter(c => c.status === 'ACTIVE').length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content */}
        {selectedBrandId && (
          <Card>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading data...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              )}

              {/* Tracking Categories Tab */}
              {!loading && !error && activeTab === 'tracking' && (
                <>
                  {/* Filters */}
                  {trackingCategories.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Statuses</option>
                        {uniqueStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Filter className="h-4 w-4" />
                        {filteredCategories.length} of {trackingCategories.length}
                      </div>
                    </div>
                  )}

                  {trackingCategories.length === 0 && (
                    <div className="text-center py-8">
                      <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Tracking Categories Found</h3>
                      <p className="text-gray-600">No tracking categories are available for this brand.</p>
                    </div>
                  )}

                  {filteredCategories.length === 0 && trackingCategories.length > 0 && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Categories</h3>
                      <p className="text-gray-600">No categories match your current filters.</p>
                    </div>
                  )}

                  {filteredCategories.length > 0 && (
                    <div className="space-y-6">
                      {filteredCategories.map((category) => (
                        <div key={category.trackingCategoryID} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Tag className="h-5 w-5 text-blue-500" />
                              <div>
                                <h3 className="font-medium text-gray-900">{category.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getStatusColor(category.status)}>
                                    {category.status}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {category.options.length} option{category.options.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {category.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {category.options.map((option) => (
                                <div key={option.trackingOptionID} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{option.name}</span>
                                    <Badge className={getStatusColor(option.status)} variant="outline">
                                      {option.status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono mt-1">{option.trackingOptionID}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Organisation Tab */}
              {!loading && !error && activeTab === 'organisation' && (
                <div className="space-y-6">
                  {organisation ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Organisation Name</label>
                          <div className="text-lg font-semibold text-gray-900">{organisation.name}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Organisation Type</label>
                          <div className="text-lg text-gray-900">{organisation.organisationType}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Version</label>
                          <div className="text-lg text-gray-900">{organisation.version}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Base Currency</label>
                          <div className="text-lg font-semibold text-gray-900">{organisation.baseCurrency}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Country Code</label>
                          <div className="text-lg text-gray-900">{organisation.countryCode}</div>
                        </div>
                        {organisation.taxNumber && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Tax Number</label>
                            <div className="text-lg text-gray-900">{organisation.taxNumber}</div>
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Organisation ID</label>
                        <div className="text-sm font-mono text-gray-600 bg-gray-100 p-2 rounded">{organisation.organisationID}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Organisation Information</h3>
                      <p className="text-gray-600">Organisation information is not available.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Currencies Tab */}
              {!loading && !error && activeTab === 'currencies' && (
                <div className="space-y-6">
                  {currencies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currencies.map((currency) => (
                        <div key={currency.code} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            <div>
                              <div className="font-mono font-bold text-lg text-gray-900">{currency.code}</div>
                              <div className="text-sm text-gray-600">{currency.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Currencies Found</h3>
                      <p className="text-gray-600">No currency information is available.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}