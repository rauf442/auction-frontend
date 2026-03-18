// frontend/src/app/items/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Download, Upload, Filter, MoreVertical, Eye, Sparkles, RefreshCw, FileText, Share2, Printer, Check, Trophy, Trash2, Search, ChevronDown, Copy } from 'lucide-react'
import { Artwork, ArtworksAPI, ArtworksResponse } from '@/lib/items-api'
import { useBrand } from '@/lib/brand-context'
import ItemsTable from '@/components/items/ItemsTable'
import ItemsFilter from '@/components/items/ItemsFilter'
import PendingItemsTab from '@/components/items/PendingItemsTab'
import CSVUpload from '@/components/items/CSVUpload'
import AIImageUpload from '@/components/items/AIImageUpload'
import AIBulkGenerationModal from '@/components/items/AIBulkGenerationModal'
import ArtworkSelection from '@/components/items/ArtworkSelection'
import UnifiedCatalogGenerator from '@/components/items/PDFCatalogGenerator'
import ImportExportDialog from '@/components/items/ImportExportDialog'
import DuplicateDetectionModal from '@/components/items/DuplicateDetectionModal'
import { 
  loadBrandGoogleSheetUrl,
  syncArtworksFromGoogleSheet 
} from '@/lib/google-sheets-api'
import GoogleSheetsSyncModal from '@/components/items/GoogleSheetsSyncModal'
import GenerateAuctionModal from '@/components/items/GenerateAuctionModal'

interface FilterState {
  status: string;
  category: string;
  search: string;
  brand?: string;
  item_id?: string;
  low_est_min?: string;
  low_est_max?: string;
  high_est_min?: string;
  high_est_max?: string;
  start_price_min?: string;
  start_price_max?: string;
  condition?: string;
  period_age?: string;
  materials?: string;
  artist_id?: string;
  school_id?: string;
}

// Local storage key for persisting state
const STORAGE_KEY = 'items_page_state'

export default function ItemsPage() {
  const router = useRouter()
  const { brand } = useBrand()
  const [initialized, setInitialized] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showAIBulkModal, setShowAIBulkModal] = useState(false)
  const [showAdvancedSelection, setShowAdvancedSelection] = useState(false)
  const [showPDFGenerator, setShowPDFGenerator] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false)
  const [showGenerateAuctionModal, setShowGenerateAuctionModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'pending'>('inventory')
  const [showToolsDropdown, setShowToolsDropdown] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [showPublicFormDropdown, setShowPublicFormDropdown] = useState(false)
  const [loadingAllItemsForSheets, setLoadingAllItemsForSheets] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)

  // Pagination and filtering state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: '',
    search: '',
    brand: '',
    item_id: '',
    low_est_min: '',
    low_est_max: '',
    high_est_min: '',
    high_est_max: '',
    start_price_min: '',
    start_price_max: '',
    condition: '',
    period_age: '',
    materials: '',
    artist_id: '',
    school_id: ''
  })
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [counts, setCounts] = useState({
    draft: 0,
    active: 0,
    sold: 0,
    withdrawn: 0,
    passed: 0,
    returned: 0
  })

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        const parsed = JSON.parse(savedState)
        setPage(parsed.page || 1)
        setLimit(parsed.limit || 25)
        setFilters(parsed.filters || filters)
        setSortField(parsed.sortField || 'id')
        setSortDirection(parsed.sortDirection || 'asc')
        setSelectedItems(parsed.selectedItems || [])
      }
    } catch (err) {
      console.error('Failed to load saved state:', err)
    }
    setInitialized(true)
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!initialized) return

    try {
      const state = {
        page,
        limit,
        filters,
        sortField,
        sortDirection,
        selectedItems,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.error('Failed to save state:', err)
    }
  }, [page, limit, filters, sortField, sortDirection, selectedItems, initialized])

  // Load artworks - wrapped in useCallback to avoid infinite loops
  const loadItems = useCallback(async () => {
    if (!initialized) return
    
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const queryParams: any = {
        ...filters,
        page,
        limit,
        sort_field: sortField,
        sort_direction: sortDirection
      }

      // Handle brand filtering: only add brand_code if a specific brand is selected
      // filters.brand being empty string means "All Brands" - don't filter by brand
      if (filters.brand && filters.brand.trim() !== '') {
        queryParams.brand_code = filters.brand
      }

      // Convert item_id to item_ids for backend API
      if (filters.item_id && filters.item_id.trim()) {
        queryParams.item_ids = filters.item_id.trim()
      }
      
      const response: ArtworksResponse = await ArtworksAPI.getArtworks(queryParams)

      if (response.success) {
        setArtworks(response.data)
        setTotal(response.pagination.total)
        setCounts(response.counts)
      } else {
        setError('Failed to load artworks')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load artworks')
      console.error('Failed to load artworks:', err)
    } finally {
      setLoading(false)
    }
  }, [initialized, filters, page, limit, sortField, sortDirection])

  // Load items when dependencies change
  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Load all items for Google Sheets export (with pagination handling)
  const loadAllItems = useCallback(async () => {
    if (!initialized) return

    try {
      // Build base query parameters
      const baseQueryParams: any = {
        ...filters,
        sort_field: sortField,
        sort_direction: sortDirection
      }

      // Handle brand filtering: only add brand_code if a specific brand is selected
      if (filters.brand && filters.brand.trim() !== '') {
        baseQueryParams.brand_code = filters.brand
      }

      // Convert item_id to item_ids for backend API
      if (filters.item_id && filters.item_id.trim()) {
        baseQueryParams.item_ids = filters.item_id.trim()
      }

      // First, get total count to determine how many pages we need
      const countResponse: ArtworksResponse = await ArtworksAPI.getArtworks({
        ...baseQueryParams,
        page: 1,
        limit: 1 // Just get count, not actual data
      })

      if (!countResponse.success || !countResponse.pagination) {
        console.error('Failed to get total count for Google Sheets export')
        return
      }

      const totalItems = countResponse.pagination.total
      const pageSize = 1000 // Use maximum allowed by Supabase
      const totalPages = Math.ceil(totalItems / pageSize)

      console.log(`Loading ${totalItems} items across ${totalPages} pages for Google Sheets export`)

      // Fetch all pages
      const allItems: Artwork[] = []
      for (let page = 1; page <= totalPages; page++) {
        const pageQueryParams = {
          ...baseQueryParams,
          page,
          limit: pageSize
        }

        const pageResponse: ArtworksResponse = await ArtworksAPI.getArtworks(pageQueryParams)

        if (pageResponse.success && pageResponse.data) {
          allItems.push(...pageResponse.data)
          console.log(`Loaded page ${page}/${totalPages}: ${pageResponse.data.length} items (total: ${allItems.length})`)
        } else {
          console.error(`Failed to load page ${page} for Google Sheets export`)
          break
        }
      }

      setAllArtworks(allItems)
      console.log(`Successfully loaded ${allItems.length} items for Google Sheets export`)

    } catch (err: any) {
      console.error('Failed to load all artworks:', err)
    }
  }, [initialized, filters, sortField, sortDirection])

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filtering
  }

  // Helper function to change page
  const navigateToPage = (newPage: number) => {
    setPage(newPage)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to withdraw this artwork?')) return

    try {
      await ArtworksAPI.deleteArtwork(itemId)
      loadItems() // Reload the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete artwork')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return

    try {
      let confirmMessage = ''
      switch (action) {
        case 'delete':
          confirmMessage = `Are you sure you want to delete ${selectedItems.length} artwork(s)?`
          break
        case 'activate':
          confirmMessage = `Are you sure you want to activate ${selectedItems.length} artwork(s)?`
          break
        case 'draft':
          confirmMessage = `Are you sure you want to set ${selectedItems.length} artwork(s) to draft?`
          break
      }

      if (!confirm(confirmMessage)) return

      if (action === 'delete') {
        await ArtworksAPI.bulkAction('delete', selectedItems)
      } else {
        await ArtworksAPI.bulkAction('update_status', selectedItems, { status: action === 'activate' ? 'active' : 'draft' })
      }

      setSelectedItems([])
      setShowBulkActions(false)
      loadItems()
    } catch (err: any) {
      setError(err.message || 'Failed to perform bulk action')
    }
  }

  const handleAIUploadComplete = async (result: any) => {
    try {
      setShowAIModal(false)
      setLoading(true)
      
      // Extract selectedBrand from result (passed from AI modal)
      const { selectedBrand, ...artworkData } = result
      
      // Create the artwork directly in the database
      const finalArtworkData = {
        ...artworkData,
        status: 'draft'
      }
      
      // Use the selected brand from the AI modal
      const targetBrand = selectedBrand || 'MSABER'
      
      // Create artwork using items API (which has auto-sync)
      await ArtworksAPI.createArtwork(finalArtworkData, targetBrand)
      
      // Reload items to show the new artwork
      await loadItems()
      
      toast.success(`AI-generated artwork saved successfully to ${targetBrand}!`)
    } catch (err: any) {
      console.error('Failed to save AI-generated artwork:', err)
      setError(err.message || 'Failed to save AI-generated artwork')
    } finally {
      setLoading(false)
    }
  }

  const handleAIBulkComplete = (results: any[]) => {
    setShowAIBulkModal(false)
    // Reload items to show the new artworks
    loadItems()
    toast.success(`Successfully generated and saved ${results.length} artworks!`)
  }

  const handlePDFAction = (action: 'generate' | 'share' | 'print') => {
    if (selectedItems.length === 0) {
      toast.warning('Please select artworks first')
      return
    }
    setShowPDFGenerator(true)
  }

  const handleSelectionAction = (action: string) => {
    switch (action) {
      case 'advanced':
        setShowAdvancedSelection(true)
        break
      case 'all':
        setSelectedItems(artworks.map(a => a.id!).filter(id => id))
        break
      case 'none':
        setSelectedItems([])
        break
    }
    setShowBulkActions(false)
  }

  const getSelectedArtworks = async (): Promise<Artwork[]> => {
    if (selectedItems.length === 0) return []

    // First try to get artworks from current page data (for performance)
    const currentPageArtworks = artworks.filter(artwork => selectedItems.includes(artwork.id!))

    // If all selected items are on the current page, return them
    if (currentPageArtworks.length === selectedItems.length) {
      return currentPageArtworks
    }

    // Otherwise, fetch all selected artworks from the API
    try {
      const fetchedArtworks: Artwork[] = []
      for (const itemId of selectedItems) {
        try {
          const response = await ArtworksAPI.getArtwork(itemId)
          if (response.success) {
            fetchedArtworks.push(response.data)
          }
        } catch (error) {
          console.warn(`Failed to fetch artwork ${itemId}:`, error)
        }
      }
      return fetchedArtworks
    } catch (error) {
      console.error('Failed to fetch selected artworks:', error)
      // Fallback to current page artworks
      return currentPageArtworks
    }
  }

  const handleOpenPublicForm = (brand: 'metsab' | 'aurum') => {
    const baseUrl = brand === 'metsab'
      ? process.env.NEXT_PUBLIC_FRONTEND_URL_METSAB
      : process.env.NEXT_PUBLIC_FRONTEND_URL_AURUM
    const url = `${baseUrl}/inventory-form`
    window.open(url, '_blank', 'noopener,noreferrer')
    setShowPublicFormDropdown(false)
  }

  const handleSharePublicForm = async (brand: 'metsab' | 'aurum') => {
    const baseUrl = brand === 'metsab'
      ? process.env.NEXT_PUBLIC_FRONTEND_URL_METSAB
      : process.env.NEXT_PUBLIC_FRONTEND_URL_AURUM
    const url = `${baseUrl}/inventory-form`
    const title = `Submit items to ${brand.charAt(0).toUpperCase() + brand.slice(1)} Auction House`

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Submit your valuable items for auction at ${brand.charAt(0).toUpperCase() + brand.slice(1)}`,
          url
        })
      } catch (error) {
        // Handle user canceling the share dialog (AbortError) or other share errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error)
          // Fallback to clipboard copy
          try {
            await navigator.clipboard.writeText(url)
            toast.success(`Link copied to clipboard: ${url}`)
          } catch (clipboardError) {
            console.error('Clipboard copy failed:', clipboardError)
            toast.error(`Share failed. URL: ${url}`)
          }
        }
        // If it's AbortError (user canceled), we silently continue
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success(`Link copied to clipboard: ${url}`)
      } catch (error) {
        console.error('Clipboard copy failed:', error)
        toast.error(`Share failed. URL: ${url}`)
      }
    }
    setShowPublicFormDropdown(false)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="h-screen flex flex-col p-2 sm:p-4 lg:p-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 w-full max-w-full">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your auction items and export to major bidding platforms</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Primary Actions */}
          <div className="relative">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="flex items-center justify-center sm:justify-start px-3 py-2 sm:px-4 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm w-full sm:w-auto cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Item</span>
              <span className="sm:hidden">Add</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showAddDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-2">
                  <button
                    onClick={() => {
                      router.push('/items/new')
                      setShowAddDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Plus className="h-4 w-4 mr-3 text-gray-400" />
                    <div>
                      <div className="font-medium">Add Single Item</div>
                      <div className="text-xs text-gray-500">Create one artwork manually</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowAIBulkModal(true)
                      setShowAddDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Sparkles className="h-4 w-4 mr-3 text-purple-500" />
                    <div>
                      <div className="font-medium">AI Bulk Generate</div>
                      <div className="text-xs text-gray-500">Generate multiple items with AI</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowImportDialog(true)
                      setShowAddDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Upload className="h-4 w-4 mr-3 text-green-500" />
                    <div>
                      <div className="font-medium">Import CSV</div>
                      <div className="text-xs text-gray-500">Import from spreadsheet</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="flex items-center justify-center sm:justify-start px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm w-full sm:w-auto cursor-pointer"
            >
              <MoreVertical className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Tools</span>
              <span className="sm:hidden">Tools</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showToolsDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowDuplicateModal(true)
                      setShowToolsDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Copy className="h-4 w-4 mr-3 text-orange-500" />
                    <div>
                      <div className="font-medium">Detect Duplicates</div>
                      <div className="text-xs text-gray-500">Find duplicate or similar images</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportDialog(true)
                      setShowToolsDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Download className="h-4 w-4 mr-3 text-blue-500" />
                    <div>
                      <div className="font-medium">Export Data</div>
                      <div className="text-xs text-gray-500">Export to CSV or platforms</div>
                    </div>
                  </button>
                  <button
                    onClick={async () => {
                      // Load all items for Google Sheets export
                      setLoadingAllItemsForSheets(true)
                      await loadAllItems()
                      setLoadingAllItemsForSheets(false)
                      setShowGoogleSheetsModal(true)
                      setShowToolsDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <RefreshCw className="h-4 w-4 mr-3 text-indigo-500" />
                    <div>
                      <div className="font-medium">Sync Google Sheets</div>
                      <div className="text-xs text-gray-500">Sync with Google Sheets</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Public Forms Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPublicFormDropdown(!showPublicFormDropdown)}
              className="flex items-center justify-center sm:justify-start px-3 py-2 sm:px-4 sm:py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm w-full sm:w-auto cursor-pointer"
            >
              <Eye className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Public Forms</span>
              <span className="sm:hidden">Forms</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {showPublicFormDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-2">
                  <button
                    onClick={() => handleOpenPublicForm('metsab')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Eye className="h-4 w-4 mr-3 text-blue-500" />
                    <div>
                      <div className="font-medium">Open Metsab Form</div>
                      <div className="text-xs text-gray-500">Premium auction house</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSharePublicForm('metsab')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Share2 className="h-4 w-4 mr-3 text-green-500" />
                    <div>
                      <div className="font-medium">Share Metsab Form</div>
                      <div className="text-xs text-gray-500">Share premium form link</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleOpenPublicForm('aurum')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Eye className="h-4 w-4 mr-3 text-purple-500" />
                    <div>
                      <div className="font-medium">Open Aurum Form</div>
                      <div className="text-xs text-gray-500">General auction platform</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSharePublicForm('aurum')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center cursor-pointer hover:underline"
                  >
                    <Share2 className="h-4 w-4 mr-3 text-orange-500" />
                    <div>
                      <div className="font-medium">Share Aurum Form</div>
                      <div className="text-xs text-gray-500">Share general form link</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 underline text-xs sm:text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selection and Catalog Actions */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-blue-800 font-medium text-sm">
                {selectedItems.length} artwork(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePDFAction('generate')}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Generate Catalog</span>
                  <span className="sm:hidden">Catalog</span>
                </button>
                <button
                  onClick={() => setShowGenerateAuctionModal(true)}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-orange-600 text-white rounded text-xs sm:text-sm hover:bg-orange-700"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Add to Auction</span>
                  <span className="sm:hidden">Auction</span>
                </button>
                <button
                  onClick={() => handlePDFAction('share')}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-green-600 text-white rounded text-xs sm:text-sm hover:bg-green-700"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </button>
                <button
                  onClick={() => handlePDFAction('print')}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-purple-600 text-white rounded text-xs sm:text-sm hover:bg-purple-700"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedItems([])}
              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm self-center sm:self-auto"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Filters and Controls */}
      <div className="bg-white rounded-lg border mb-6 flex-1 flex flex-col">
        {/* Always-visible filter bar with improved layout */}
        <div className="px-2 sm:px-4 py-3 sm:py-4 border-b border-gray-200 w-full">
          <ItemsFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            statusCounts={counts}
            filteredStatusCounts={counts}
            totalItems={total}
          />
        </div>

        {/* Controls and Selection */}
        <div className="px-2 sm:px-4 py-3 border-b border-gray-200 bg-gray-50 w-full">
          {/* Top Pagination */}
          {totalPages > 1 && (
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs sm:text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()} items
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => navigateToPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

                    // Adjust start page if we're near the end
                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }

                    // Add first page and ellipsis if needed
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => navigateToPage(1)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="start-ellipsis" className="px-1 text-xs text-gray-400">…</span>);
                      }
                    }

                    // Add visible page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => navigateToPage(i)}
                          className={`px-2 py-1 border rounded text-xs font-medium cursor-pointer ${
                            i === page
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Add last page and ellipsis if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="end-ellipsis" className="px-1 text-xs text-gray-400">…</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => navigateToPage(totalPages)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}

                  <button
                    onClick={() => navigateToPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm text-gray-600">Select:</span>
                <button
                  onClick={() => handleSelectionAction('advanced')}
                  className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 underline"
                >
                  Advanced
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => handleSelectionAction('all')}
                  className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 underline"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => handleSelectionAction('none')}
                  className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 underline"
                >
                  None
                </button>
              </div>

              {selectedItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 bg-blue-100 px-2 py-1 rounded-full">
                    {selectedItems.length} selected
                  </span>

                  {/* Quick Bulk Delete Button */}
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm"
                    title="Withdraw Selected Items"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Delete {selectedItems.length}</span>
                    <span className="sm:hidden">Del {selectedItems.length}</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm"
                    >
                      <MoreVertical className="h-3 w-3 mr-1" />
                      More
                    </button>

                    {showBulkActions && (
                      <div className="absolute top-full left-0 mt-1 w-40 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => handleBulkAction('activate')}
                          className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 text-xs sm:text-sm"
                        >
                          Set to Active
                        </button>
                        <button
                          onClick={() => handleBulkAction('draft')}
                          className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 text-xs sm:text-sm"
                        >
                          Set to Draft
                        </button>
                        <button
                          onClick={() => handleBulkAction('delete')}
                          className="w-full text-left px-3 sm:px-4 py-2 hover:bg-red-50 text-xs sm:text-sm text-red-600"
                        >
                          Delete Items
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      // Load all items for Google Sheets export
                      setShowGoogleSheetsModal(true)
                      setLoadingAllItemsForSheets(true)
                      await loadAllItems()
                      setLoadingAllItemsForSheets(false)
                    }}
                    className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                  >
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Google Sheets</span>
                        <span className="sm:hidden">Sheets</span>
                  </button>
                </div>
              )}
          </div>

            <div className="flex items-center">
              <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()} items
              </span>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="px-2 sm:px-4 border-b border-gray-200 w-full">
          <div className="flex gap-2">
            <button onClick={()=>setActiveSubTab('inventory')} className={`px-3 py-2 text-xs sm:text-sm ${activeSubTab==='inventory'?'border-b-2 border-teal-600 text-teal-700':'text-gray-600'}`}>Inventory</button>
            <button onClick={()=>setActiveSubTab('pending')} className={`px-3 py-2 text-xs sm:text-sm ${activeSubTab==='pending'?'border-b-2 border-teal-600 text-teal-700':'text-gray-600'}`}>Pending</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeSubTab === 'inventory' ? (
            loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading items...</p>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <ItemsTable
                  key={`items-table-${page}-${sortField}-${sortDirection}-${limit}`}
                  items={artworks}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onDelete={handleDeleteItem}
                  currentPage={page}
                  currentFilters={filters}
                  currentLimit={limit}
                />
              </div>
            )
          ) : (
            <PendingItemsTab />
          )}
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 w-full">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <span className="text-xs sm:text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()} items
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Items per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value))
                      navigateToPage(1)
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => navigateToPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${!page || page > 1 ? 'cursor-pointer' : ''}`}
                >
                  ‹
                </button>

                {/* Page Numbers */}
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => navigateToPage(1)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="start-ellipsis" className="px-1 text-xs text-gray-400">…</span>);
                    }
                  }

                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => navigateToPage(i)}
                        className={`px-2 py-1 border rounded text-xs font-medium cursor-pointer ${
                          i === page
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Add last page and ellipsis if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="end-ellipsis" className="px-1 text-xs text-gray-400">…</span>);
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => navigateToPage(totalPages)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}

                <button
                  onClick={() => navigateToPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={`px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${page < totalPages ? 'cursor-pointer' : ''}`}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <CSVUpload
              onUploadComplete={(count) => {
                setShowUploadModal(false)
                loadItems() // Reload the items list
              }}
              onClose={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}

      {/* AI Image Upload Modal */}
      {showAIModal && (
        <AIImageUpload
          onUploadComplete={handleAIUploadComplete}
          onClose={() => setShowAIModal(false)}
          currentBrand={brand}
        />
      )}

      {/* AI Bulk Generation Modal */}
      {showAIBulkModal && (
        <AIBulkGenerationModal
          onComplete={handleAIBulkComplete}
          onClose={() => setShowAIBulkModal(false)}
        />
      )}

      {/* Advanced Selection Modal */}
      {showAdvancedSelection && (
        <ArtworkSelection
          artworks={artworks}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          onClose={() => setShowAdvancedSelection(false)}
        />
      )}

      {/* PDF Catalog Generator */}
      {showPDFGenerator && (
        <UnifiedCatalogGenerator
          selectedArtworks={artworks.filter(artwork => selectedItems.includes(artwork.id!))}
          onClose={() => setShowPDFGenerator(false)}
          getSelectedArtworks={getSelectedArtworks}
        />
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportExportDialog
          mode="import"
          onClose={() => setShowImportDialog(false)}
          onComplete={(result) => {
            setShowImportDialog(false)
            loadItems()
          }}
          brand={brand}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ImportExportDialog
          mode="export"
          onClose={() => setShowExportDialog(false)}
          selectedItems={selectedItems}
          brand={brand}
        />
      )}

      {/* Google Sheets Sync Modal */}
      {showGoogleSheetsModal && (
        <GoogleSheetsSyncModal
          onClose={() => setShowGoogleSheetsModal(false)}
          onSyncComplete={(result) => {
            setShowGoogleSheetsModal(false)
            loadItems() // Reload items after sync
          }}
          selectedItems={selectedItems}
          allItems={allArtworks}
          currentBrand={brand}
          isLoadingAllItems={loadingAllItemsForSheets}
        />
      )}

      {/* Add to Auction Modal */}
      {showGenerateAuctionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGenerateAuctionModal(false)
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <GenerateAuctionModal
              onClose={() => setShowGenerateAuctionModal(false)}
              selectedArtworks={selectedItems}
              onComplete={(auctionId) => {
                setShowGenerateAuctionModal(false)
                setSelectedItems([]) // Clear selection after adding to auction
              }}
            />
          </div>
        </div>
      )}

      {/* Duplicate Detection Modal */}
      {showDuplicateModal && (
        <DuplicateDetectionModal
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      {/* Click outside to close dropdowns */}
      {(showAddDropdown || showToolsDropdown || showPublicFormDropdown) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowAddDropdown(false)
            setShowToolsDropdown(false)
            setShowPublicFormDropdown(false)
          }}
        />
      )}
    </div>
  )
}