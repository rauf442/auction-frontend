"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import ConsignmentsTable from '@/components/consignments/ConsignmentsTable'
import CSVUpload from '@/components/consignments/CSVUpload'
import ConsignmentPDFGeneratorBackend from '@/components/consignments/ConsignmentPDFGeneratorBackend'
import ConsignmentGoogleSheetsSync from '@/components/consignments/ConsignmentGoogleSheetsSync'
import { Plus, Download, Upload, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { getConsignments, exportConsignmentsCSV } from '@/lib/consignments-api'
import { formatClientDisplay } from '@/lib/clients-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { ListPageHeader } from '@/components/layout/ListPageHeader'
import { ActionChip } from '@/components/layout/ActionChip'

const PAGE_SIZE = 25

const convertConsignmentFormat = (consignment: any) => {
  let clientName = 'Unknown Client'
  if (consignment.clients) {
    const client = consignment.clients
    const firstName = client.first_name || ''
    const lastName = client.last_name || ''
    const companyName = client.company_name || ''
    if (companyName) {
      clientName = companyName
    } else if (firstName || lastName) {
      clientName = [firstName, lastName].filter(Boolean).join(' ')
    }
  } else {
    clientName = consignment.client_name
      || [consignment.client_first_name, consignment.client_last_name].filter(Boolean).join(' ')
      || consignment.client_company
      || 'Unknown Client'
  }

  const brandCode = consignment.client_brand_code
    || consignment.brand_code
    || (consignment.clients && consignment.clients.brands && consignment.clients.brands.code)
    || null

  return {
    id: consignment.id,
    number: consignment.id,
    client: clientName,
    client_id: consignment.client_id,
    clientIdFormatted: formatClientDisplay({
      id: consignment.client_id,
      brand_code: brandCode,
      brand: brandCode
    } as any),
    itemsCount: consignment.items_count || 0,
    specialist: consignment.specialist_name || consignment.specialist || 'Unknown Specialist',
    defaultSale: consignment.default_sale || '',
    created: consignment.created_at ? new Date(consignment.created_at).toLocaleDateString() : '',
    signed: consignment.is_signed || false
  }
}

function CustomDropdown({
  label,
  value,
  options,
  onChange,
  defaultValue
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  defaultValue: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel =
    options.find(o => o.value === value)?.label || options[0]?.label

  const isFiltered = value !== defaultValue

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        {label}
      </label>

      <div
        className={`flex items-center justify-between w-full px-3 py-2 rounded-2xl border cursor-pointer bg-white ${
          value !== defaultValue ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm truncate">
          {selectedLabel}
        </span>

        <div className="flex items-center gap-1 ml-2">
          {value !== defaultValue && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChange(defaultValue)
                setIsOpen(false)
              }}
              className="p-0.5 rounded-full hover:bg-teal-200 text-teal-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {label}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 ${
                  value === option.value
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConsignmentsPage() {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'cancelled' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsignments, setSelectedConsignments] = useState<number[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [showPDFGenerator, setShowPDFGenerator] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)
  const [consignments, setConsignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [consignmentSuggestions, setConsignmentSuggestions] = useState<Array<{ value: string, label: string, description: string }>>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Keep filters in refs so handlePageChange can always access latest values
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [activeSearch, setActiveSearch] = useState<string>('')

  const fetchConsignments = useCallback(async (page: number, status: string, search: string) => {
    try {
      setLoading(true)
      const params: any = { page, limit: PAGE_SIZE }
      if (status && status !== 'all') params.status = status
      if (search && search.trim() !== '') params.search = search.trim()

      const response = await getConsignments(params)
      const consignmentsData = response.data || (response as any).consignments || []
      const pagination = response.pagination || (response as any).pagination

      setConsignments(consignmentsData.map(convertConsignmentFormat))
      setCurrentPage(pagination?.page ?? page)
      setTotalPages(pagination?.pages ?? 1)
      setTotalCount(pagination?.total ?? consignmentsData.length)
    } catch (error) {
      console.error('Error fetching consignments:', error)
      setConsignments([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadConsignmentSuggestions = async () => {
    try {
      setLoadingSuggestions(true)
      const response = await getConsignments({ limit: 200 })
      const consignmentsData = response.data || (response as any).consignments || []

      const suggestions = [{ value: '', label: 'All Consignments', description: 'Show all consignments' }]
      const clientNames = new Set<string>()
      const consignmentNumbers = new Set<string>()

      consignmentsData.forEach((consignment: any) => {
        const clientName = consignment.client_name ||
          [consignment.client_first_name, consignment.client_last_name].filter(Boolean).join(' ') ||
          consignment.client_company

        if (clientName && !clientNames.has(clientName.toLowerCase())) {
          clientNames.add(clientName.toLowerCase())
          if (clientNames.size <= 10) {
            suggestions.push({ value: clientName, label: clientName, description: `Search for ${clientName}'s consignments` })
          }
        }

        if (consignment.id && !consignmentNumbers.has(consignment.id.toString())) {
          consignmentNumbers.add(consignment.id.toString())
          if (consignmentNumbers.size <= 10) {
            suggestions.push({ value: consignment.id.toString(), label: `Consignment #${consignment.id}`, description: `Search for consignment ${consignment.id}` })
          }
        }
      })

      setConsignmentSuggestions(suggestions)
    } catch (error) {
      console.error('Error loading consignment suggestions:', error)
      setConsignmentSuggestions([{ value: '', label: 'All Consignments', description: 'Show all consignments' }])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => { loadConsignmentSuggestions() }, [])

  // Initial load
  useEffect(() => { fetchConsignments(1, 'all', '') }, [fetchConsignments])

  const applyFilters = () => {
    setActiveStatus(statusFilter)
    setActiveSearch(searchQuery)
    setCurrentPage(1)
    fetchConsignments(1, statusFilter, searchQuery)
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setSearchQuery('')
    setActiveStatus('all')
    setActiveSearch('')
    setCurrentPage(1)
    fetchConsignments(1, 'all', '')
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    setCurrentPage(page)
    fetchConsignments(page, activeStatus, activeSearch)
  }

  const handleExportCSV = async () => {
    try {
      const blob = await exportConsignmentsCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'consignments.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting consignments:', error)
    }
  }

  const handleCSVUploadComplete = (importedCount: number) => {
    setShowCSVUpload(false)
    fetchConsignments(1, activeStatus, activeSearch)
    console.log(`Imported ${importedCount} consignments`)
  }

  const handleEditConsignment = (consignment: any) => {
    router.push(`/consignments/edit/${consignment.id}`)
  }

  const handleDeleteConsignment = async (consignment: any) => {
    if (confirm(`Are you sure you want to delete consignment ${consignment.id}?`)) {
      try {
        const { deleteConsignment } = await import('@/lib/consignments-api')
        await deleteConsignment(consignment.id)
        // If last item on page, go back one page
        const newPage = consignments.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
        fetchConsignments(newPage, activeStatus, activeSearch)
      } catch (error) {
        console.error('Error deleting consignment:', error)
        toast.error('Failed to delete consignment')
      }
    }
  }

  const handleClientClick = (clientId: number) => router.push(`/clients/${clientId}`)

  const handleGenerateReportPDF = () => {
    if (selectedConsignments.length === 0) {
      toast.warning('Please select at least one consignment to generate a PDF report')
      return
    }
    setShowPDFGenerator(true)
  }

  const handlePDFComplete = () => {
    setShowPDFGenerator(false)
    setSelectedConsignments([])
  }

  const PaginationControls = () => {
    if (totalPages <= 1) return null

    const getPageNumbers = (): (number | '...')[] => {
      const pages: (number | '...')[] = []
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        if (currentPage > 3) pages.push('...')
        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)
        for (let i = start; i <= end; i++) pages.push(i)
        if (currentPage < totalPages - 2) pages.push('...')
        pages.push(totalPages)
      }
      return pages
    }

    const rangeStart = (currentPage - 1) * PAGE_SIZE + 1
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount)

    return (
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/60 rounded-t-2xl">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{rangeStart}–{rangeEnd}</span>
          {' '}of{' '}
          <span className="font-medium text-slate-700">{totalCount}</span>
          {' '}consignments
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">…</span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page as number)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                  currentPage === page
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <ListPageHeader
          eyebrow="Consignments"
          title="Client intake overview"
          description="Monitor submissions, generate paperwork, and keep vendors in sync across platforms."
          stats={[
            { label: 'Total', value: totalCount },
            { label: 'Page', value: totalPages > 1 ? `${currentPage} / ${totalPages}` : 1 },
            { label: 'Selected', value: selectedConsignments.length, tone: 'info' }
          ]}
          actions={[
            {
              label: 'New consignment',
              icon: Plus,
              onClick: () => router.push('/consignments/new'),
              variant: 'primary'
            },
            {
              label: showFilters ? 'Hide filters' : 'Show filters',
              icon: Filter,
              onClick: () => setShowFilters(prev => !prev),
              variant: 'ghost'
            }
          ]}
        />

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ActionChip icon={Download} label="Export CSV" onClick={handleExportCSV} />
            <ActionChip icon={Upload} label="Import CSV" onClick={() => setShowCSVUpload(true)} />
            <ActionChip
              icon={Download}
              label={`Generate PDF (${selectedConsignments.length})`}
              onClick={handleGenerateReportPDF}
              disabled={selectedConsignments.length === 0}
              tone="indigo"
              className={selectedConsignments.length === 0 ? 'pointer-events-none' : undefined}
            />
            <button
              onClick={() => setShowGoogleSheetsSync(true)}
              className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm cursor-pointer"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="sm:hidden">Sheets</span>
            </button>
          </div>
        </section>

        {showFilters && (
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Search</label>
                <SearchableSelect
                  value={searchQuery}
                  options={consignmentSuggestions}
                  placeholder={loadingSuggestions ? 'Loading suggestions…' : 'Search consignments…'}
                  onChange={(value) => setSearchQuery(value?.toString() || '')}
                  inputPlaceholder="Search by consignment # or client name..."
                  className="w-full"
                />
              </div>
              <div>
<CustomDropdown
  label="Status"
  value={statusFilter}
  onChange={(val) => setStatusFilter(val as any)}
  defaultValue="all"
  options={[
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'archived', label: 'Archived' },
  ]}
/>
              </div>
              <div className="flex gap-2">
                <button onClick={applyFilters} className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  Apply
                </button>
                <button onClick={clearFilters} className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Clear
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                Loading consignments…
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Pagination at the TOP */}
                <PaginationControls />

                <div className="overflow-auto">
                  <ConsignmentsTable
                    consignments={consignments}
                    selectedConsignments={selectedConsignments}
                    onSelectionChange={setSelectedConsignments}
                    onEdit={handleEditConsignment}
                    onDelete={handleDeleteConsignment}
                    onClientClick={handleClientClick}
                  />
                </div>

                {/* Summary row at bottom */}
                <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                  Showing {consignments.length} of {totalCount} · Selected {selectedConsignments.length}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CSVUpload
            onUploadComplete={handleCSVUploadComplete}
            onClose={() => setShowCSVUpload(false)}
            className="max-w-2xl w-full mx-4"
          />
        </div>
      )}

      {showPDFGenerator && (
        <ConsignmentPDFGeneratorBackend
          selectedConsignments={consignments.filter(c => selectedConsignments.includes(c.id))}
          onClose={handlePDFComplete}
        />
      )}

      {showGoogleSheetsSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ConsignmentGoogleSheetsSync
            selectedConsignments={selectedConsignments}
            onSyncComplete={(result) => {
              console.log('Google Sheets sync completed:', result)
              setShowGoogleSheetsSync(false)
            }}
            onClose={() => setShowGoogleSheetsSync(false)}
          />
        </div>
      )}
    </div>
  )
}