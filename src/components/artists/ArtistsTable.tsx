// frontend/src/components/artists/ArtistsTable.tsx
import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Edit, Trash2, Eye, Sparkles } from 'lucide-react'
import { Artist } from '@/lib/artists-api'

interface ArtistsTableProps {
  artists: Artist[]
  loading: boolean
  selectedArtists: string[]
  onSelectionChange: (artistIds: string[]) => void
  onSort: (field: string) => void
  sortField: string
  sortDirection: 'asc' | 'desc'
  onDelete: (artistId: string) => void
  onEdit: (artistId: string) => void
}

export default function ArtistsTable({
  artists,
  loading,
  selectedArtists,
  onSelectionChange,
  onSort,
  sortField,
  sortDirection,
  onDelete,
  onEdit,
}: ArtistsTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(artists.map(artist => artist.id!))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectArtist = (artistId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedArtists, artistId])
    } else {
      onSelectionChange(selectedArtists.filter(id => id !== artistId))
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 flex-shrink-0 ml-1" />
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4 flex-shrink-0 ml-1" /> :
      <ArrowDown className="h-4 w-4 flex-shrink-0 ml-1" />
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusStyles[status as keyof typeof statusStyles] || statusStyles.inactive}`}>
        {status}
      </span>
    )
  }

  const formatYear = (year?: number) => {
    return year ? year.toString() : '—'
  }

  const formatLifespan = (birthYear?: number, deathYear?: number) => {
    if (!birthYear) return '—'
    if (deathYear) {
      return `${birthYear}–${deathYear}`
    }
    return `${birthYear}–`
  }

  const getAIGeneratedIndicator = (artist: Artist) => {
    if (artist.ai_generated_fields && Object.keys(artist.ai_generated_fields).length > 0) {
      return (
        <span className="inline-flex items-center ml-2 flex-shrink-0" title="Contains AI-generated content">
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
    <div className="w-full">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-8" />
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedArtists.length === artists.length && artists.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <button
                onClick={() => onSort('name')}
                className="flex items-center w-full hover:text-gray-700"
              >
                <span className="truncate whitespace-nowrap">Name</span>
                {getSortIcon('name')}
              </button>
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <button
                onClick={() => onSort('birth_year')}
                className="flex items-center w-full hover:text-gray-700"
              >
                <span className="truncate whitespace-nowrap">Lifespan</span>
                {getSortIcon('birth_year')}
              </button>
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <button
                onClick={() => onSort('nationality')}
                className="flex items-center w-full hover:text-gray-700"
              >
                <span className="truncate whitespace-nowrap">Nationality</span>
                {getSortIcon('nationality')}
              </button>
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <button
                onClick={() => onSort('art_movement')}
                className="flex items-center w-full hover:text-gray-700"
              >
                <span className="truncate whitespace-nowrap">Movement</span>
                {getSortIcon('art_movement')}
              </button>
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <span className="truncate whitespace-nowrap block">Medium</span>
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <button
                onClick={() => onSort('created_at')}
                className="flex items-center w-full hover:text-gray-700"
              >
                <span className="truncate whitespace-nowrap">Created</span>
                {getSortIcon('created_at')}
              </button>
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden">
              <span className="truncate whitespace-nowrap block">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {artists.map((artist) => (
            <tr key={artist.id} className="hover:bg-gray-50">
              <td className="px-2 py-4">
                <input
                  type="checkbox"
                  checked={selectedArtists.includes(artist.id!)}
                  onChange={(e) => handleSelectArtist(artist.id!, e.target.checked)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-2 py-4">
                <div className="flex items-center min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate" title={artist.name}>
                    {artist.name}
                  </div>
                  {getAIGeneratedIndicator(artist)}
                </div>
              </td>
              <td className="px-2 py-4 text-sm text-gray-900">
                <div className="truncate">{formatLifespan(artist.birth_year, artist.death_year)}</div>
              </td>
              <td className="px-2 py-4 text-sm text-gray-900">
                <div className="truncate" title={artist.nationality || ''}>{artist.nationality || '—'}</div>
              </td>
              <td className="px-2 py-4 text-sm text-gray-900">
                <div className="truncate" title={artist.art_movement || ''}>{artist.art_movement || '—'}</div>
              </td>
              <td className="px-2 py-4 text-sm text-gray-900">
                <div className="truncate" title={artist.medium || ''}>{artist.medium || '—'}</div>
              </td>
              <td className="px-2 py-4 text-sm text-gray-500">
                <div className="truncate">{artist.created_at ? new Date(artist.created_at).toLocaleDateString() : '—'}</div>
                <div className="mt-1">{getStatusBadge(artist.status || 'active')}</div>
              </td>
              <td className="px-2 py-4 text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(artist.id!)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit artist"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(artist.id!)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Archive artist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {artists.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No artists found</p>
        </div>
      )}
    </div>
  )
}