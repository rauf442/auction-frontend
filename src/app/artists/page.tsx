"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Download, Filter, CheckCircle, PauseCircle, Archive } from 'lucide-react'
import { Artist, ArtistsAPI, ArtistsResponse } from '@/lib/artists-api'
import ArtistsTable from '@/components/artists/ArtistsTable'
import ArtistsFilter from '@/components/artists/ArtistsFilter'
import { ListPageHeader } from '@/components/layout/ListPageHeader'
import { ActionChip } from '@/components/layout/ActionChip'

interface FilterState {
  status: string;
  nationality: string;
  art_movement: string;
  search: string;
}

export default function ArtistsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artists, setArtists] = useState<Artist[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [selectedArtists, setSelectedArtists] = useState<string[]>([])

  
  // Pagination and filtering state
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    status: 'active',
    nationality: '',
    art_movement: '',
    search: ''
  })
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [counts, setCounts] = useState({
    active: 0,
    inactive: 0,
    archived: 0
  })

  // Load artists
  const loadArtists = useCallback(async () => {
    try {
      setLoading(true)
      const response: ArtistsResponse = await ArtistsAPI.getArtists({
        ...filters,
        page,
        limit,
        sort_field: sortField,
        sort_direction: sortDirection
      })

      if (response.success) {
        setArtists(response.data)
        setTotal(response.pagination.total)
        setCounts(response.counts)
      } else {
        setError('Failed to load artists')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load artists')
    } finally {
      setLoading(false)
    }
  }, [filters, page, limit, sortField, sortDirection])

  useEffect(() => {
    loadArtists()
  }, [page, limit, filters, sortField, sortDirection, loadArtists])

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filtering
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDeleteArtist = async (artistId: string) => {
    if (!confirm('Are you sure you want to archive this artist?')) return

    try {
      await ArtistsAPI.deleteArtist(artistId)
      loadArtists() // Reload the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete artist')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedArtists.length === 0) return

    try {
      let confirmMessage = ''
      switch (action) {
        case 'delete':
          confirmMessage = `Are you sure you want to archive ${selectedArtists.length} artist(s)?`
          break
        case 'activate':
          confirmMessage = `Are you sure you want to activate ${selectedArtists.length} artist(s)?`
          break
        case 'inactive':
          confirmMessage = `Are you sure you want to set ${selectedArtists.length} artist(s) to inactive?`
          break
      }

      if (!confirm(confirmMessage)) return

      if (action === 'delete') {
        await ArtistsAPI.bulkAction('delete', selectedArtists)
      } else {
        await ArtistsAPI.bulkAction('update_status', selectedArtists, { status: action === 'activate' ? 'active' : 'inactive' })
      }

      setSelectedArtists([])
      loadArtists()
    } catch (err: any) {
      setError(err.message || 'Failed to perform bulk action')
    }
  }

  const handleExportCSV = async () => {
    try {
      await ArtistsAPI.exportCSV({
        status: filters.status === 'all' ? undefined : filters.status,
        nationality: filters.nationality || undefined,
        art_movement: filters.art_movement || undefined
      })
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <ListPageHeader
          eyebrow="Artists"
          title="Artist directory"
          description="Manage your artist database with AI generation support."
          stats={[
            { label: 'Active', value: counts.active, tone: 'success' },
            { label: 'Inactive', value: counts.inactive, tone: 'warning' },
            { label: 'Archived', value: counts.archived }
          ]}
          actions={[
            {
              label: 'Add artist',
              icon: Plus,
              onClick: () => router.push('/artists/new'),
              variant: 'primary'
            },
            {
              label: 'Export CSV',
              icon: Download,
              onClick: handleExportCSV,
              variant: 'secondary'
            },
            {
              label: showFilters ? 'Hide filters' : 'Show filters',
              icon: Filter,
              onClick: () => setShowFilters(prev => !prev),
              variant: 'ghost'
            }
          ]}
        />

        {showFilters && (
          <section className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
              >
                Hide
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <ArtistsFilter filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </section>
        )}

        {selectedArtists.length > 0 && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-blue-800">
                {selectedArtists.length} artist(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
                <ActionChip
                  icon={CheckCircle}
                  label="Activate"
                  onClick={() => handleBulkAction('activate')}
                  tone="emerald"
                />
                <ActionChip
                  icon={PauseCircle}
                  label="Set inactive"
                  onClick={() => handleBulkAction('inactive')}
                  tone="amber"
                />
                <ActionChip
                  icon={Archive}
                  label="Archive"
                  onClick={() => handleBulkAction('delete')}
                  tone="rose"
                />
              </div>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs font-semibold uppercase tracking-wide text-rose-600 hover:text-rose-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <ArtistsTable
            artists={artists}
            loading={loading}
            selectedArtists={selectedArtists}
            onSelectionChange={setSelectedArtists}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            onDelete={handleDeleteArtist}
            onEdit={(id: string) => router.push(`/artists/edit/${id}`)}
          />

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {(page - 1) * limit + 1} – {Math.min(page * limit, total)} of {total} artists
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
} 