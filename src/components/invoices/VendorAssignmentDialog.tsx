// frontend/admin/src/components/invoices/VendorAssignmentDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, User, Package, AlertCircle } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface VendorAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  items: Array<{
    id: number
    title: string
    artist_maker?: string
    vendor_id?: number | null
    consignment_id?: number | null
  }>
  onSuccess: () => void
}

interface Client {
  id: number
  first_name: string
  last_name: string
  company_name?: string
  email?: string
}

interface Consignment {
  id: number
  client_id: number
  status: string
}

export default function VendorAssignmentDialog({
  isOpen,
  onClose,
  items,
  onSuccess
}: VendorAssignmentDialogProps) {
  const { brand } = useBrand()
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null)
  const [selectedConsignment, setSelectedConsignment] = useState<number | null>(null)
  const [vendors, setVendors] = useState<Client[]>([])
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [loadingConsignments, setLoadingConsignments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(items.map(i => i.id)))

  useEffect(() => {
    if (isOpen) {
      fetchVendors()
      setSelectedItems(new Set(items.map(i => i.id)))
    }
  }, [isOpen, items])

  useEffect(() => {
    if (selectedVendor) {
      fetchConsignments(selectedVendor)
    } else {
      setConsignments([])
      setSelectedConsignment(null)
    }
  }, [selectedVendor])

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true)
      const token = localStorage.getItem('token')
      const brandCode = typeof brand === 'string' ? brand : (brand as any)?.code
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients?brand_code=${brandCode}&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) throw new Error('Failed to fetch vendors')

      const result = await response.json()
      if (result.success) {
        // Filter to only show clients that are vendors
        setVendors(result.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching vendors:', err)
      setError('Failed to load vendors')
    } finally {
      setLoadingVendors(false)
    }
  }

  const fetchConsignments = async (vendorId: number) => {
    try {
      setLoadingConsignments(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/consignments?client_id=${vendorId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) throw new Error('Failed to fetch consignments')

      const result = await response.json()
      if (result.success) {
        setConsignments(result.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching consignments:', err)
      setError('Failed to load consignments')
    } finally {
      setLoadingConsignments(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedVendor) {
      setError('Please select a vendor')
      return
    }

    if (selectedItems.size === 0) {
      setError('Please select at least one item')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const token = localStorage.getItem('token')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/assign-vendor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            item_ids: Array.from(selectedItems),
            vendor_id: selectedVendor,
            consignment_id: selectedConsignment || undefined
          })
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to assign vendor')
      }

      toast.success(`Successfully assigned vendor to ${selectedItems.size} item(s)${!selectedConsignment ? ' and created new consignment' : ''}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error assigning vendor:', err)
      setError(err.message || 'Failed to assign vendor')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleItemSelection = (itemId: number) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const toggleAllItems = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(i => i.id)))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <User className="h-6 w-6 text-blue-500 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">
              Assign Vendor to Items
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Items Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Items ({selectedItems.size} selected)
            </label>
            <button
              onClick={toggleAllItems}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleItemSelection(item.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {item.title || `Item #${item.id}`}
                  </div>
                  {item.artist_maker && (
                    <div className="text-sm text-gray-500">
                      by {item.artist_maker}
                    </div>
                  )}
                  {item.vendor_id && (
                    <div className="text-xs text-green-600 mt-1">
                      Already assigned to vendor #{item.vendor_id}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Vendor *
          </label>
          <SearchableSelect
            value={selectedVendor?.toString() || null}
            options={vendors.map(vendor => {
              const displayName = vendor.company_name || `${vendor.first_name} ${vendor.last_name}`
              const clientId = `Client ID: ${vendor.id}`
              const email = vendor.email || 'No email'
              return {
                value: vendor.id.toString(),
                label: displayName,
                description: `${clientId} • ${email}`
              }
            })}
            placeholder={loadingVendors ? "Loading vendors..." : "Select vendor..."}
            onChange={(value) => setSelectedVendor(value ? parseInt(value) : null)}
            disabled={loadingVendors}
            inputPlaceholder="Search vendors..."
          />
        </div>

        {/* Consignment Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consignment Number (Optional)
          </label>
          {!selectedVendor ? (
            <div className="text-sm text-gray-500">
              Select a vendor first to see their consignments
            </div>
          ) : loadingConsignments ? (
            <div className="text-sm text-gray-500">Loading consignments...</div>
          ) : (
            <>
              <select
                value={selectedConsignment || ''}
                onChange={(e) => setSelectedConsignment(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Create New Consignment --</option>
                {consignments.map((consignment) => (
                  <option key={consignment.id} value={consignment.id}>
                    Consignment #{consignment.id} ({consignment.status})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                If no consignment is selected, a new one will be created automatically
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedVendor || selectedItems.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Assign Vendor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

