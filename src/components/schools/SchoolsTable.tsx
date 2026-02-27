// frontend/src/components/schools/SchoolsTable.tsx
import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Sparkles } from 'lucide-react'
import { School } from '@/lib/schools-api'

interface SchoolsTableProps {
  schools: School[]
  loading: boolean
  selectedSchools: string[]
  onSelectionChange: (schoolIds: string[]) => void
  onSort: (field: string) => void
  sortField: string
  sortDirection: 'asc' | 'desc'
  onDelete: (schoolId: string) => void
  onEdit: (schoolId: string) => void
}

export default function SchoolsTable({
  schools,
  loading,
  selectedSchools,
  onSelectionChange,
  onSort,
  sortField,
  sortDirection,
  onDelete,
  onEdit,
}: SchoolsTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(schools.map(school => school.id!))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectSchool = (schoolId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedSchools, schoolId])
    } else {
      onSelectionChange(selectedSchools.filter(id => id !== schoolId))
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4" /> :
      <ArrowDown className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles] || statusStyles.inactive}`}>
        {status}
      </span>
    )
  }

  const formatYears = (foundedYear?: number, closedYear?: number) => {
    if (!foundedYear) return '—'
    if (closedYear) {
      return `${foundedYear}–${closedYear}`
    }
    return `${foundedYear}–`
  }

  const getAIGeneratedIndicator = (school: School) => {
    if (school.ai_generated_fields && Object.keys(school.ai_generated_fields).length > 0) {
      return (
        <span className="inline-flex items-center ml-2" title="Contains AI-generated content">
          <Sparkles className="h-3 w-3 text-purple-500" />
        </span>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedSchools.length === schools.length && schools.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('name')}
                className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
              >
                <span>Name</span>
                {getSortIcon('name')}
              </button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
              <button
                onClick={() => onSort('location')}
                className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
              >
                <span>Location</span>
                {getSortIcon('location')}
              </button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px' }}>
              Specialties
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('created_at')}
                className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
              >
                <span>Created</span>
                {getSortIcon('created_at')}
              </button>
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {schools.map((school) => (
            <tr key={school.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedSchools.includes(school.id!)}
                  onChange={(e) => handleSelectSchool(school.id!, e.target.checked)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {school.name}
                  </div>
                  {getAIGeneratedIndicator(school)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatYears(school.founded_year, school.closed_year)}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                <div>
                  {school.location && (
                    <div className="font-medium truncate text-xs max-w-xs">{school.location}</div>
                  )}
                  {school.country && (
                    <div className="text-gray-500 truncate text-xs max-w-xs">{school.country}</div>
                  )}
                  {!school.location && !school.country && '—'}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="max-w-xs break-words">
                  {school.specialties || '—'}
                </div>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div>{school.created_at ? new Date(school.created_at).toLocaleDateString() : '—'}</div>
                  <div className="mt-1">{getStatusBadge(school.status || 'active')}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onEdit(school.id!)}
                    className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                    title="Edit school"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(school.id!)}
                    className="text-red-600 hover:text-red-900 cursor-pointer"
                    title="Archive school"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {schools.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No schools found</p>
        </div>
      )}
    </div>
  )
} 