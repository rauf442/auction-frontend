"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Edit, X, User, Trash2 } from 'lucide-react'

interface Consignment {
  id: number
  number: string
  client: string
  client_id?: number
  clientId?: number
  clientIdFormatted: string
  itemsCount: number
  created: string
  signed: boolean
  brandCode?: string
  client_brand_code?: string
}

interface ConsignmentsTableProps {
  consignments: Consignment[]
  selectedConsignments: number[]
  onSelectionChange: (selected: number[]) => void
  onEdit?: (consignment: Consignment) => void
  onDelete?: (consignment: Consignment) => void
  onClientClick?: (clientId: number) => void
}

type SortField = keyof Consignment
type SortDirection = 'asc' | 'desc'

export default function ConsignmentsTable({
  consignments,
  selectedConsignments,
  onSelectionChange,
  onEdit,
  onDelete,
  onClientClick
}: ConsignmentsTableProps) {
  const [sortField, setSortField] = useState<SortField>('number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(consignments.map(consignment => consignment.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectConsignment = (consignmentId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedConsignments, consignmentId])
    } else {
      onSelectionChange(selectedConsignments.filter(id => id !== consignmentId))
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 text-gray-600" /> :
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  const sortedConsignments = [...consignments].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0
    if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1
    if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedConsignments.length === consignments.length && consignments.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('number')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Consignment Number</span>
                  <SortIcon field="number" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client ID
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('client')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Client</span>
                  <SortIcon field="client" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                # Items
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Created</span>
                  <SortIcon field="created" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('signed')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Signed</span>
                  <SortIcon field="signed" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sortedConsignments.map((consignment) => (
              <tr key={consignment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedConsignments.includes(consignment.id)}
                    onChange={(e) => handleSelectConsignment(consignment.id, e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/consignments/view/${consignment.id}`} className="text-teal-600 hover:text-teal-700 font-medium hover:underline">
                    {consignment.number}
                  </Link>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {consignment.clientIdFormatted}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-teal-500 mr-2" />
                    <span
                      className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer hover:underline"
                      onClick={() => {
                        const clientId = consignment.client_id || consignment.clientId;
                        if (clientId) {
                          onClientClick?.(clientId);
                        } else {
                          console.error('No client ID available for consignment:', consignment);
                        }
                      }}
                    >
                      {consignment.client}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consignment.itemsCount}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consignment.created}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {consignment.signed ? (
                    <span className="inline-flex items-center text-green-600">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-red-500">
                      <X className="h-4 w-4" />
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEdit?.(consignment)}
                      className="text-blue-600 hover:text-blue-800 cursor-pointer"
                      title="Edit consignment"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete?.(consignment)}
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                      title="Delete consignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {consignments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No consignments found</p>
          </div>
        )}
      </div>
    </div>
  )
} 