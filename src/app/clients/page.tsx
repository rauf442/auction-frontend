"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Download, AlertCircle, Upload, RefreshCw } from 'lucide-react'
import ClientsFilter from '@/components/clients/ClientsFilter'
import ClientsTable from '@/components/clients/ClientsTable'
import CSVUpload from '@/components/clients/CSVUpload'
import { fetchClients, exportClientsCSV, bulkActionClients, deleteClient, type Client, type ClientsResponse, type BulkActionRequest } from '@/lib/clients-api'
import { useBrand } from '@/lib/brand-context'
import { 
  syncClientsFromGoogleSheet, 
  loadBrandGoogleSheetUrl, 
  saveBrandGoogleSheetUrl,
  getApiBaseUrl 
} from '@/lib/google-sheets-api'
import ClientGoogleSheetsSync from '@/components/clients/ClientGoogleSheetsSync'

export default function ClientsPage() {
  const { brand } = useBrand()
  const [showFilters, setShowFilters] = useState(true)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  })
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sort_field: 'id',
    sort_direction: 'asc' as 'asc' | 'desc',
    client_type: 'all' as 'all' | 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor',
    tags: '',
    platform: 'all' as 'all' | 'Liveauctioneer' | 'The saleroom' | 'Invaluable' | 'Easylive auctions' | 'Private' | 'Others',
    registration_date: 'all' as 'all' | '30days' | '3months' | '6months' | '1year'
  })

  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [hasGoogleSheetConfig, setHasGoogleSheetConfig] = useState(false)
  const [showBrandSelector, setShowBrandSelector] = useState(false)
  const [availableBrands, setAvailableBrands] = useState<any[]>([])
  const [selectedBrandForSync, setSelectedBrandForSync] = useState('')
  const [editingSheetUrl, setEditingSheetUrl] = useState('')
  const [showUrlEditor, setShowUrlEditor] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)

  // Activity state
  const [activityCounts, setActivityCounts] = useState({
    active: 0,
    suspended: 0,
    pending: 0,
    archived: 0,
    deleted: 0
  })

  // Load Google Sheets URL from brand settings
  const loadGoogleSheetUrl = async () => {
    try {
      if (brand === 'ALL') {
        setHasGoogleSheetConfig(false)
        return
      }

      const url = await loadBrandGoogleSheetUrl(brand)
      if (url) {
        setGoogleSheetUrl(url)
        setHasGoogleSheetConfig(true)
      } else {
        setHasGoogleSheetConfig(false)
      }
    } catch (error) {
      console.error('Error loading Google Sheets URL:', error)
      setHasGoogleSheetConfig(false)
    }
  }


  // Enhanced Google Sheets sync with pre-refresh and post-save sync
  const syncWithGoogleSheet = async (autoSync = false, customUrl?: string, selectedBrandCode?: string) => {
    const urlToUse = customUrl || googleSheetUrl
    if (!urlToUse) {
      if (!autoSync) alert('No Google Sheets URL configured for this brand. Please configure it in Settings > Brands.')
      return
    }

    try {
      setSyncing(true)
      
      // Use the selected brand for filling empty brand fields
      const brandForEmptyFields = selectedBrandCode || (brand !== 'ALL' ? brand : undefined)
      
      const result = await syncClientsFromGoogleSheet(urlToUse, brandForEmptyFields)
      
      if (!result.success) {
        throw new Error(result.error || 'Sync failed')
      }
      
      await loadClients()
      
      if (!autoSync) {
        const summary = result.summary || {
          rowsInCsv: 0,
          rowsProcessed: 0,
          rowsUpserted: 0,
          errorCount: 0
        };
        const errors = result.errors || [];
        const message = `Google Sheets Sync Complete:
• CSV Rows: ${summary.rowsInCsv || 0}
• Processed: ${summary.rowsProcessed || 0}
• Successfully Synced: ${result.upserted || 0} clients
• Errors: ${errors.length || 0}
${brandForEmptyFields ? `\n• Used '${brandForEmptyFields}' for empty brand fields` : ''}

${errors.length > 0 ? '\nFirst few errors:\n' + errors.slice(0, 3).join('\n') : ''}`;
        alert(message);
      }
      
      return result
    } catch (error: any) {
      console.error('Google Sheets sync error:', error)
      if (!autoSync) {
        alert(error.message || 'Sync failed')
      }
      throw error
    } finally {
      setSyncing(false)
    }
  }

  // Load available brands for selection
  const loadAvailableBrands = async () => {
    try {
      const apiUrl = getApiBaseUrl()
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/brands`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableBrands(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  // Handle Google Sheets refresh button click
  const handleGoogleSheetsRefresh = async () => {
    // If brand is 'ALL', show brand selector
    if (brand === 'ALL') {
      await loadAvailableBrands()
      setShowBrandSelector(true)
      return
    }

    // If current brand has Google Sheets URL, sync directly
    if (googleSheetUrl) {
      await syncWithGoogleSheet(false)
      return
    }

    // If no URL configured, show configuration option
    const shouldConfigure = confirm(`No Google Sheets URL configured for brand "${brand}". Would you like to configure it now?`)
    if (shouldConfigure) {
      setEditingSheetUrl('')
      setShowUrlEditor(true)
    }
  }

  // Save Google Sheets URL for a brand
  const saveGoogleSheetUrl = async (brandCode: string, url: string) => {
    try {
      const success = await saveBrandGoogleSheetUrl(brandCode, url)
      
      if (success) {
        // Reload the Google Sheets URL for current brand
        await loadGoogleSheetUrl()
        alert('Google Sheets URL saved successfully!')
        return true
      } else {
        alert('Failed to save Google Sheets URL')
        return false
      }
    } catch (error) {
      console.error('Error saving Google Sheets URL:', error)
      alert('Failed to save Google Sheets URL')
      return false
    }
  }

  // Handle brand selection for sync
  const handleBrandSync = async () => {
    if (!selectedBrandForSync) {
      alert('Please select a brand')
      return
    }

    try {
      // Load Google Sheets URL for selected brand
      const googleSheetUrl = await loadBrandGoogleSheetUrl(selectedBrandForSync)
      
      if (googleSheetUrl) {
        setShowBrandSelector(false)
        // Pass the selected brand code to fill empty brand fields
        await syncWithGoogleSheet(false, googleSheetUrl, selectedBrandForSync)
      } else {
        // No URL configured for this brand
        const shouldConfigure = confirm(`No Google Sheets URL configured for brand "${selectedBrandForSync}". Would you like to configure it now?`)
        if (shouldConfigure) {
          setEditingSheetUrl('')
          setShowUrlEditor(true)
        }
      }
    } catch (error) {
      console.error('Error loading brand settings:', error)
      alert('Failed to load brand settings')
    }
  }

  const loadClients = async () => {
    try {
      setError(null)
      const params: any = {
        status: filters.status,
        search: filters.search,
        sort_field: filters.sort_field,
        sort_direction: filters.sort_direction,
        page: pagination.page,
        limit: pagination.limit,
        tags: filters.tags,
        platform: filters.platform,
        registration_date: filters.registration_date
      };
      if (filters.client_type !== 'all') {
        params.client_type = filters.client_type;
      }

      const response: ClientsResponse = await fetchClients(params)

      if (response.success) {
        setClients(response.data)
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 0
        }))

        if (response.counts) {
          setActivityCounts(response.counts)
        }
      } else {
        setError('Failed to fetch clients')
      }
    } catch (err: any) {
      console.error('Error fetching clients:', err)
      setError(err.message || 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [filters, pagination.page, pagination.limit])

  useEffect(() => {
    loadGoogleSheetUrl()
  }, [brand])

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }

  const handleSort = (field: string) => {
    const direction = filters.sort_field === field && filters.sort_direction === 'asc'
      ? 'desc'
      : 'asc'
    setFilters(prev => ({ ...prev, sort_field: field, sort_direction: direction }))
  }

  const handleExportCSV = async () => {
    try {
      const blob = await exportClientsCSV({
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search || undefined
      })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error exporting CSV:', err)
      setError(err.message || 'Failed to export CSV')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return

    if (confirm(`Are you sure you want to delete ${selectedClients.length} client(s)?`)) {
      try {
        const request: BulkActionRequest = {
          action: 'delete',
          client_ids: selectedClients.map(id => parseInt(id))
        }
        await bulkActionClients(request)
        setSelectedClients([])
        loadClients() // Refresh data
      } catch (err: any) {
        console.error('Error deleting clients:', err)
        setError(err.message || 'Failed to delete clients')
      }
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteClient(parseInt(clientId))
        loadClients() // Refresh data
      } catch (err: any) {
        console.error('Error deleting client:', err)
        setError(err.message || 'Failed to delete client')
      }
    }
  }

  const handleEditClient = (client: Client) => {
    // Navigate to edit page with the client ID
    window.location.href = `/clients/edit/${client.id}`
  }

  const filteredClients = clients; // server-side filtering now handles search/type/tags/dates

  const handleCSVUploadSuccess = (importedClients: Client[]) => {
    setShowCSVUpload(false)
    loadClients() // Refresh the client list
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="bg-slate-700 px-2 py-3 sm:px-4 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 w-full">
        <h1 className="text-lg sm:text-2xl font-semibold text-white">Clients</h1>
        <Link
          href="/clients/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md flex items-center justify-center sm:justify-start space-x-2 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add New Client</span>
          <span className="sm:hidden">Add Client</span>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 sm:p-4 mx-2 sm:mx-4 mt-4 rounded-md flex items-start sm:items-center space-x-2 w-auto max-w-full">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span className="text-red-700 text-sm flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-lg flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white border-b border-gray-200">
            <ClientsFilter
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {/* Table Actions */}
        <div className="bg-white px-2 sm:px-4 py-3 border-b border-gray-200 w-full">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 hover:text-teal-800 active:bg-teal-200 transition-colors cursor-pointer hover:underline"
                title="Toggle filters"
              >
                <span>🔍 {showFilters ? 'Hide' : 'Show'} filter</span>
              </button>

              {selectedClients.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-800 active:bg-red-200 transition-colors cursor-pointer hover:underline"
                  title="Delete selected clients"
                >
                  Delete Selected ({selectedClients.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <button
                onClick={() => setShowCSVUpload(true)}
                className="inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 hover:text-teal-800 active:bg-teal-200 transition-colors cursor-pointer hover:underline"
                title="Import clients from CSV"
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">CSV Import</span>
                <span className="sm:hidden">Import</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={false}
                className="inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 transition-colors cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export clients to CSV"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">CSV Export</span>
                <span className="sm:hidden">Export</span>
              </button>
              <button
                onClick={() => setShowGoogleSheetsSync(true)}
                className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Google Sheets</span>
                <span className="sm:hidden">Sheets</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading clients...</div>
            </div>
          ) : (
            <ClientsTable
              clients={clients}
              loading={loading}
              selectedClients={selectedClients}
              onSelectionChange={setSelectedClients}
              onSort={handleSort}
              sortField={filters.sort_field}
              sortDirection={filters.sort_direction}
              onRefresh={loadClients}
              onClientEdit={handleEditClient}
              status={filters.status !== 'all' ? filters.status : undefined}
              search={filters.search || undefined}
              client_type={filters.client_type}
              tags={filters.tags}
              registration_date={filters.registration_date}
              platform={filters.platform}
            />
          )}
        </div>

        {/* Footer with Status Indicators */}
        <div className="bg-white border-t border-gray-200 px-2 sm:px-4 py-3 sm:py-4 w-full">
          <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 w-full max-w-full">
            {/* Status Indicators */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Active ({activityCounts.active})</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Suspended ({activityCounts.suspended})</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Pending ({activityCounts.pending})</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-400 rounded-full"></div>
                <span className="text-gray-600">Deleted ({activityCounts.deleted})</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Archived ({activityCounts.archived})</span>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col space-y-2 sm:space-y-3 lg:space-y-0 lg:flex-row lg:items-center lg:space-x-4">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} clients
              </div>
              
              {pagination.pages > 1 && (
                <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-2">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 transition-colors cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
                      title="Previous page"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {/* Show simplified page numbers on mobile */}
                      <span className="text-xs sm:text-sm text-gray-600 px-2">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.pages}
                      className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 transition-colors cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
                      title="Next page"
                    >
                      Next
                    </button>
                  </div>
                  
                  <select
                    value={pagination.limit}
                    onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                    className="border border-gray-300 rounded text-xs sm:text-sm px-2 py-1 self-center"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <CSVUpload
          onImportComplete={handleCSVUploadSuccess}
          onClose={() => setShowCSVUpload(false)}
        />
      )}

      {/* Google Sheets Sync Modal */}
      {showGoogleSheetsSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ClientGoogleSheetsSync
            onClose={() => setShowGoogleSheetsSync(false)}
            onSyncComplete={(result) => {
              console.log('Sync completed:', result)
              if (result.success) {
                loadClients() // Refresh the clients list
              }
            }}
            selectedClients={selectedClients.map(id => parseInt(id))}
          />
        </div>
      )}

      {/* Brand Selector Modal */}
      {showBrandSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Brand for Google Sheets Sync</h3>
            <p className="text-sm text-gray-600 mb-4">
              You're currently viewing all brands. Please select a specific brand to sync with Google Sheets.
            </p>
            
            <select
              value={selectedBrandForSync}
              onChange={(e) => setSelectedBrandForSync(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            >
              <option value="">Select a brand...</option>
              {availableBrands.map((brand) => (
                <option key={brand.id} value={brand.code}>
                  {brand.name} ({brand.code})
                </option>
              ))}
            </select>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBrandSelector(false)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 transition-colors cursor-pointer"
                title="Cancel selection"
              >
                Cancel
              </button>
              <button
                onClick={handleBrandSync}
                disabled={!selectedBrandForSync}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                title="Sync with selected brand"
              >
                Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Editor Modal */}
      {showUrlEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Configure Google Sheets URL</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the Google Sheets URL for brand "{selectedBrandForSync || brand}":
            </p>
            
            <input
              type="url"
              value={editingSheetUrl}
              onChange={(e) => setEditingSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            />
            
            <div className="text-xs text-gray-500 mb-4">
              Tip: Use the Google Sheets export URL in CSV format for automatic sync
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUrlEditor(false)
                  setShowBrandSelector(false)
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 transition-colors cursor-pointer"
                title="Cancel URL configuration"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editingSheetUrl) {
                    alert('Please enter a valid URL')
                    return
                  }

                  const brandToSave = selectedBrandForSync || brand
                  const success = await saveGoogleSheetUrl(brandToSave, editingSheetUrl)
                  if (success) {
                    setShowUrlEditor(false)
                    setShowBrandSelector(false)
                    // Try syncing with the new URL, passing the brand for empty fields
                    await syncWithGoogleSheet(false, editingSheetUrl, brandToSave)
                  }
                }}
                disabled={!editingSheetUrl}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                title="Save URL and sync data"
              >
                Save & Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 