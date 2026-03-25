// frontend/src/app/schools/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Download, Filter, CheckCircle, PauseCircle, Archive } from 'lucide-react'
import { School, SchoolsAPI, SchoolsResponse } from '@/lib/schools-api'
import SchoolsTable from '@/components/schools/SchoolsTable'
import SchoolsFilter from '@/components/schools/SchoolsFilter'
import { ListPageHeader } from '@/components/layout/ListPageHeader'
import { ActionChip } from '@/components/layout/ActionChip'

interface FilterState {
  status: string;
  country: string;
  school_type: string;
  search: string;
}

export default function SchoolsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  
  // Pagination and filtering state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    status: 'active',
    country: '',
    school_type: '',
    search: ''
  })
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [counts, setCounts] = useState({
    active: 0,
    inactive: 0,
    archived: 0
  })

  // Load schools
  const loadSchools = async () => {
    try {
      setLoading(true)
      const response: SchoolsResponse = await SchoolsAPI.getSchools({
        ...filters,
        page,
        limit,
        sort_field: sortField,
        sort_direction: sortDirection
      })

      if (response.success) {
        setSchools(response.data)
        setTotal(response.pagination.total)
        setCounts(response.counts)
      } else {
        setError('Failed to load schools')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchools()
  }, [page, limit, filters, sortField, sortDirection])

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

const handleDeleteSchool = async (schoolId: string) => {
  toast.warning('Are you sure you want to archive this school?', {
    action: {
      label: 'Archive',
      onClick: async () => {
        try {
          await SchoolsAPI.deleteSchool(schoolId)
          loadSchools() // Reload the list
          toast.success('School archived successfully')
        } catch (err: any) {
          setError(err.message || 'Failed to archive school')
        }
      }
    },
    cancel: {
      label: 'Cancel',
      onClick: () => {}
    },
    duration: 10000 // 10 seconds to decide
  })
}

  const handleBulkAction = async (actionType: string) => {
    if (selectedSchools.length === 0) return

    const messages: Record<string, { message: string; label: string; successMessage: string }> = {
      delete: {
        message: `Archive ${selectedSchools.length} school(s)?`,
        label: 'Archive',
        successMessage: 'Schools archived successfully'
      },
      activate: {
        message: `Activate ${selectedSchools.length} school(s)?`,
        label: 'Activate',
        successMessage: 'Schools activated successfully'
      },
      inactive: {
        message: `Set ${selectedSchools.length} school(s) to inactive?`,
        label: 'Set Inactive',
        successMessage: 'Schools set to inactive successfully'
      }
    }

    const config = messages[actionType]
    if (!config) return

    toast.warning(config.message, {
      action: {
        label: config.label,
        onClick: async () => {
          try {
            if (actionType === 'delete') {
              await SchoolsAPI.bulkAction('delete', selectedSchools)
            } else {
              await SchoolsAPI.bulkAction('update_status', selectedSchools, { 
                status: actionType === 'activate' ? 'active' : 'inactive' 
              })
            }

            setSelectedSchools([])
            loadSchools()
            toast.success(config.successMessage)
          } catch (err: any) {
            setError(err.message || 'Failed to perform bulk action')
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      },
      duration: 10000
    })
  }

  const handleExportCSV = async () => {
    try {
      await SchoolsAPI.exportCSV({
        status: filters.status === 'all' ? undefined : filters.status,
        country: filters.country || undefined,
        school_type: filters.school_type || undefined
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
          eyebrow="Schools"
          title="School of Art registry"
          description="Manage education partners, accreditations, and AI-enriched profiles."
          stats={[
            { label: 'Active', value: counts.active, tone: 'success' },
            { label: 'Inactive', value: counts.inactive, tone: 'warning' },
            { label: 'Archived', value: counts.archived }
          ]}
          actions={[
            {
              label: 'Add school',
              icon: Plus,
              onClick: () => router.push('/schools/new'),
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
              <SchoolsFilter filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </section>
        )}

        {selectedSchools.length > 0 && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-blue-800">
                {selectedSchools.length} school(s) selected
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
          <SchoolsTable
            schools={schools}
            loading={loading}
            selectedSchools={selectedSchools}
            onSelectionChange={setSelectedSchools}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            onDelete={handleDeleteSchool}
            onEdit={(id: string) => router.push(`/schools/edit/${id}`)}
          />

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {(page - 1) * limit + 1} – {Math.min(page * limit, total)} of {total} schools
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