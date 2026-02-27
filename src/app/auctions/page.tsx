"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AuctionsTable from '@/components/auctions/AuctionsTable'
import CSVUpload from '@/components/auctions/CSVUpload'
import { Plus, Download, Upload, RefreshCw } from 'lucide-react'

import { getAuctions, exportAuctionsCSV, deleteAuction, getAuctionStatusCounts, isAuctionPast } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import { useBrand } from '@/lib/brand-context'
import type { Auction } from '@/lib/auctions-api'
import AuctionExportDialog from '@/components/auctions/AuctionExportDialog'
import AuctionGoogleSheetsSync from '@/components/auctions/AuctionGoogleSheetsSync'
import AuctionsFilter from '@/components/auctions/AuctionsFilter'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'
import { ListPageHeader } from '@/components/layout/ListPageHeader'
import { ActionChip } from '@/components/layout/ActionChip'

// Convert API auction to component auction format
const convertAuctionFormat = (auction: Auction) => ({
  id: auction.id,
  number: auction.id.toString().slice(-3),
  short_name: auction.short_name,
  long_name: auction.long_name || auction.short_name,
  type: auction.type === 'timed' ? 'Timed' : auction.type === 'live' ? 'Live' : 'Private Sale',
  lots: auction.artwork_ids?.length || 0,
  endingDate: auction.settlement_date ? new Date(auction.settlement_date).toLocaleDateString() : '',
  catalogue_launch_date: auction.catalogue_launch_date,
  settlement_date: auction.settlement_date,
  upload_status: auction.upload_status,
  brand: auction.brand,
  platform: auction.platform
})

interface FilterState {
  status: string
  type: string
  search: string
  specialist: string
  dateRange: string
}

export default function AuctionsPage() {
  const router = useRouter()
  const { brand } = useBrand()
  const auctionsTableRef = useRef<{ handleGeneratePassedAuction: (auctionIds: number[]) => void } | null>(null)

  const [selectedAuctions, setSelectedAuctions] = useState<number[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [auctions, setAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12, // Show only 12 items as requested
    total: 0,
    pages: 0
  })

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)
  const [showEOADialog, setShowEOADialog] = useState(false)
  const [selectedAuctionForEOA, setSelectedAuctionForEOA] = useState<number | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  // Get brand ID from brand code
  const getBrandId = (brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    search: '',
    specialist: 'all',
    dateRange: 'all'
  })
  const [statusCounts, setStatusCounts] = useState({
    future: 0,
    present: 0,
    past: 0
  })
  const [lastStatusCountFetch, setLastStatusCountFetch] = useState<number>(0)

  // Sort state
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Prepare backend filters - let backend handle all filtering and sorting
        const brandId = getBrandId(brand)
        const backendFilters: any = {
          page: pagination.page,
          limit: pagination.limit,
          sort_field: sortField,
          sort_direction: sortDirection,
          brand_id: brandId
        }

        // Apply filters to backend request
        if (filters.type !== 'all') {
          backendFilters.type = filters.type
        }

        if (filters.search) {
          backendFilters.search = filters.search
        }

        // Note: specialist and dateRange filters will be applied client-side for now
        // since the backend doesn't support them yet

        const response = await getAuctions(backendFilters)

        let filteredAuctions = response.auctions

        // Apply remaining client-side filters that backend doesn't support
        if (filters.status !== 'all') {
          filteredAuctions = filteredAuctions.filter(auction => {
            const today = new Date()
            const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
            const settlementDate = new Date(auction.settlement_date)

            let auctionStatus = 'future'
            if (isAuctionPast(auction)) {
              auctionStatus = 'past'
            } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
              auctionStatus = 'present'
            }

            return auctionStatus === filters.status
          })
        }

        if (filters.specialist !== 'all') {
          filteredAuctions = filteredAuctions.filter(auction => auction.specialist_id === parseInt(filters.specialist))
        }

        // Apply date range filter
        if (filters.dateRange !== 'all') {
          filteredAuctions = applyDateRangeFilter(filteredAuctions, filters.dateRange)
        }

        // Convert API auctions to component format
        const convertedAuctions = filteredAuctions.map(convertAuctionFormat)
        setAuctions(convertedAuctions)

        // Update pagination state
        if (response.pagination) {
          setPagination(response.pagination)
        }

        // Calculate status counts using dedicated endpoint (throttled to avoid excessive calls)
        const now = Date.now();
        const shouldFetchCounts = now - lastStatusCountFetch > 30000; // 30 seconds throttle

        if (shouldFetchCounts) {
          try {
            const brandId = getBrandId(brand)
            const countsResponse = await getAuctionStatusCounts(brandId);
            if (countsResponse.success) {
              setStatusCounts(countsResponse.counts);
              setLastStatusCountFetch(now);
            }
          } catch (error) {
            console.warn('Failed to fetch status counts:', error);
            // Fallback to calculating from current page data
            calculateStatusCounts(filteredAuctions);
          }
        } else {
          // Use cached counts or calculate from current data
          calculateStatusCounts(filteredAuctions);
        }
      } catch (err: any) {
        console.error('Error loading auctions:', err)
        const msg = err?.message || 'Failed to load auctions'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadAuctions()
  }, [brand, filters, sortField, sortDirection, pagination.page, pagination.limit])

  // Load brands on component mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await getBrands()
        if (response.success) {
          setBrands(response.data)
        }
      } catch (err: any) {
        console.error('Error loading brands:', err)
      }
    }
    loadBrands()
  }, [])

  // Reset status count fetch timer when brand changes
  useEffect(() => {
    setLastStatusCountFetch(0)
  }, [brand])

  // Handle sort changes
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field)
    setSortDirection(direction)
  }

  // Helper function to apply date range filters
  const applyDateRangeFilter = (auctions: any[], dateRange: string) => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const startOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    return auctions.filter(auction => {
      if (!auction.settlement_date) return false
      const auctionDate = new Date(auction.settlement_date)

      switch (dateRange) {
        case 'this_week':
          return auctionDate >= startOfWeek
        case 'this_month':
          return auctionDate >= startOfMonth && auctionDate < startOfNextMonth
        case 'next_month':
          return auctionDate >= startOfNextMonth
        case 'past_month':
          return auctionDate >= startOfPastMonth && auctionDate < startOfMonth
        default:
          return true
      }
    })
  }

  // Helper function to calculate status counts
  const calculateStatusCounts = (auctions: any[]) => {
    const counts = {
      future: 0,
      present: 0,
      past: 0
    }

    const today = new Date()

    auctions.forEach(auction => {
      const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
      const settlementDate = new Date(auction.settlement_date)

      if (isAuctionPast(auction)) {
        counts.past++
      } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
        counts.present++
      } else {
        counts.future++
      }
    })

    setStatusCounts(counts)
  }

  // Filter change handler
  const handleFilterChange = (filterUpdates: Partial<FilterState>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...filterUpdates
    }))
  }

  const handleExportCSV = async () => {
    try {
      const blob = await exportAuctionsCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'auctions.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting auctions:', error)
    }
  }

  const handleCSVUploadComplete = async (importedCount: number) => {
    setShowCSVUpload(false)
    console.log(`Imported ${importedCount} auctions`)
    
    // Refresh auctions list
    try {
      const response = await getAuctions({
        page: 1,
        limit: 25,
        sort_field: 'id',
        sort_direction: 'asc'
      })
      
      const convertedAuctions = response.auctions.map(convertAuctionFormat)
      setAuctions(convertedAuctions)
    } catch (err) {
      console.error('Error refreshing auctions:', err)
    }
  }

  const handleViewAuction = (auctionId: number) => {
    router.push(`/auctions/view/${auctionId}`)
  }

  const handleEditAuction = (auctionId: number) => {
    router.push(`/auctions/edit/${auctionId}`)
  }

  const handleDeleteAuction = async (auctionId: number) => {
    if (!confirm('Are you sure you want to delete this auction? This action cannot be undone.')) {
      return
    }

    try {
      await deleteAuction(String(auctionId))
      
      // Refresh auctions list
      const brandId = getBrandId(brand)
      const response = await getAuctions({
        page: 1,
        limit: 25,
        sort_field: 'id',
        sort_direction: 'asc',
        brand_id: brandId
      })
      
      const convertedAuctions = response.auctions.map(convertAuctionFormat)
      setAuctions(convertedAuctions)
      
      setError(null)
    } catch (err: any) {
      console.error('Error deleting auction:', err)
      setError(`Failed to delete auction: ${err.message}`)
    }
  }

  const handleImportEOA = (auctionId: number) => {
    setSelectedAuctionForEOA(auctionId)
    setShowEOADialog(true)
  }

  const handleGenerateInvoice = (auctionId: number) => {
    // Navigate to auction invoice view page
    router.push(`/auctions/${auctionId}/invoices`)
  }

  const handleGeneratePassedAuctionBulk = () => {
    if (selectedAuctions.length === 0) {
      alert('Please select at least one auction')
      return
    }

    // Call the handler function via ref
    if (auctionsTableRef.current) {
      auctionsTableRef.current.handleGeneratePassedAuction(selectedAuctions)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <ListPageHeader
          eyebrow="Auctions"
          title="Live operations board"
          description="Track consignments, sync platforms, and deploy catalogues from a single workspace."
          stats={[
            { label: 'Future', value: statusCounts.future, tone: 'info' },
            { label: 'Present', value: statusCounts.present, tone: 'success' },
            { label: 'Past', value: statusCounts.past, tone: 'warning' }
          ]}
          actions={[
            {
              label: 'New auction',
              icon: Plus,
              onClick: () => router.push('/auctions/new'),
              variant: 'primary'
            },
            {
              label: 'Sync sheets',
              icon: RefreshCw,
              onClick: () => setShowGoogleSheetsSync(true),
              variant: 'secondary'
            }
          ]}
        />

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <AuctionsFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            statusCounts={statusCounts}
          />
        </section>

        {error && (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs font-semibold text-rose-600 underline hover:text-rose-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {selectedAuctions.length > 0 && (
              <ActionChip
                icon={Plus}
                label={`Generate passed (${selectedAuctions.length})`}
                onClick={handleGeneratePassedAuctionBulk}
                tone="emerald"
              />
            )}
            <ActionChip icon={Download} label="Export CSV" onClick={handleExportCSV} />
            <ActionChip
              icon={Download}
              label="Export to platforms"
              onClick={() => setShowExportDialog(true)}
              tone="blue"
            />
            <ActionChip icon={Upload} label="Import CSV" onClick={() => setShowCSVUpload(true)} />
            <ActionChip
              icon={RefreshCw}
              label="Sync sheets"
              onClick={() => setShowGoogleSheetsSync(true)}
              tone="indigo"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-white">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                Loading auctions…
              </div>
            ) : (
              <AuctionsTable
                ref={auctionsTableRef}
                auctions={auctions}
                selectedAuctions={selectedAuctions}
                onSelectionChange={setSelectedAuctions}
                onView={handleViewAuction}
                onEdit={handleEditAuction}
                onDelete={handleDeleteAuction}
                onImportEOA={handleImportEOA}
                onGenerateInvoice={handleGenerateInvoice}
                onSort={handleSort}
                currentSortField={sortField}
                currentSortDirection={sortDirection}
                brands={brands}
              />
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-blue-500/70" />
                Future {statusCounts.future}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                Present {statusCounts.present}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                Past {statusCounts.past}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <span className="text-xs text-slate-500">
                Items {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} – {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                  className="rounded-2xl border border-slate-200 px-3 py-1 text-sm text-slate-600 focus:border-slate-400 focus:outline-none"
                >
                  <option value={12}>12</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                {pagination.pages > 1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="rounded-2xl border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-500">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                      disabled={pagination.page >= pagination.pages}
                      className="rounded-2xl border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CSVUpload
            onUploadComplete={handleCSVUploadComplete}
            onClose={() => setShowCSVUpload(false)}
            className="max-w-2xl w-full mx-4"
          />
        </div>
      )}

      {/* Export to Platforms Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuctionExportDialog
            onClose={() => setShowExportDialog(false)}
            selectedAuctions={selectedAuctions}
          />
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      {showGoogleSheetsSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuctionGoogleSheetsSync
            onClose={() => setShowGoogleSheetsSync(false)}
            onSyncComplete={() => {
              setShowGoogleSheetsSync(false)
              // Reload auctions after sync
              const loadAuctions = async () => {
                try {
                  const brandId = getBrandId(brand)
                  const response = await getAuctions({
                    page: 1,
                    limit: 25,
                    sort_field: 'id',
                    sort_direction: 'asc',
                    brand_id: brandId
                  })
                  const convertedAuctions = response.auctions.map(convertAuctionFormat)
                  setAuctions(convertedAuctions)
                } catch (err) {
                  console.error('Error refreshing auctions:', err)
                }
              }
              loadAuctions()
            }}
            selectedAuctions={selectedAuctions}
          />
        </div>
      )}



      {/* EOA Import Dialog */}
      {showEOADialog && selectedAuctionForEOA && (
        <EOAImportDialog
          auctionId={selectedAuctionForEOA}
          onClose={() => {
            setShowEOADialog(false)
            setSelectedAuctionForEOA(null)
          }}
          onImportComplete={(importedCount) => {
            console.log(`Imported ${importedCount} EOA records`)
            // Optionally refresh the auctions list or show a success message
          }}
        />
      )}
    </div>
  )
}
