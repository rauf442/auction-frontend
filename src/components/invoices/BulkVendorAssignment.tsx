// frontend/admin/src/components/invoices/BulkVendorAssignment.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, User, Package, AlertCircle, UserPlus, Check, Loader2 } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ClientForm from '@/components/clients/ClientForm'
import { fetchClients, type Client } from '@/lib/clients-api'

interface Item {
  id: number
  title: string
  artist_maker?: string
  vendor_id?: number | null
  consignment_id?: number | null
  lot_id?: string
  image_url?: string
}

interface Consignment {
  id: number
  client_id: number
  status: string
}

interface BulkVendorAssignmentProps {
  isOpen: boolean
  onClose: () => void
  auctionId: number
  auctionName: string
  onSuccess: () => void
}

interface ItemAssignment {
  itemId: number
  vendorId: number | null
  consignmentId: number | null
}

export default function BulkVendorAssignment({
  isOpen,
  onClose,
  auctionId,
  auctionName,
  onSuccess
}: BulkVendorAssignmentProps) {
  const { brand } = useBrand()
  const [items, setItems] = useState<Item[]>([])
  const [vendors, setVendors] = useState<Client[]>([])
  const [consignmentsMap, setConsignmentsMap] = useState<Map<number, Consignment[]>>(new Map())
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [assignments, setAssignments] = useState<Map<number, ItemAssignment>>(new Map())
  const [showClientModal, setShowClientModal] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchItems()
      fetchVendors()
    }
  }, [isOpen, auctionId])

  const fetchItems = async () => {
    try {
      setLoadingItems(true)
      const token = localStorage.getItem('token')
      const brandCode = typeof brand === 'string' ? brand : (brand as any)?.code
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auctions/${auctionId}?brand_code=${brandCode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) throw new Error('Failed to fetch auction items')

      const result = await response.json()
      if (result.success && result.data.artwork_ids) {
        // Fetch item details for each artwork_id
        const itemPromises = result.data.artwork_ids.map(async (artworkId: number) => {
          const itemResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/${artworkId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          )
          if (itemResponse.ok) {
            const itemData = await itemResponse.json()
            return itemData.data
          }
          return null
        })

        const itemsData = (await Promise.all(itemPromises)).filter(Boolean)
        setItems(itemsData)
      }
    } catch (err: any) {
      console.error('Error fetching items:', err)
      setError('Failed to load items')
    } finally {
      setLoadingItems(false)
    }
  }

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true)
      const brandCode = typeof brand === 'string' ? brand : (brand as any)?.code
      const response = await fetchClients({ brand_code: brandCode, limit: 1000 })
      
      if (response.success) {
        setVendors(response.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching vendors:', err)
      setError('Failed to load vendors')
    } finally {
      setLoadingVendors(false)
    }
  }

  const fetchConsignments = async (vendorId: number) => {
    if (consignmentsMap.has(vendorId)) {
      return consignmentsMap.get(vendorId) || []
    }

    try {
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
      const consignments = result.success ? result.data || [] : []
      
      setConsignmentsMap(prev => new Map(prev).set(vendorId, consignments))
      return consignments
    } catch (err: any) {
      console.error('Error fetching consignments:', err)
      return []
    }
  }

  const handleVendorChange = async (itemId: number, vendorId: string | null) => {
    const vendorIdNum = vendorId ? parseInt(vendorId) : null
    
    setAssignments(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(itemId) || { itemId, vendorId: null, consignmentId: null }
      newMap.set(itemId, { ...existing, vendorId: vendorIdNum, consignmentId: null })
      return newMap
    })

    if (vendorIdNum) {
      await fetchConsignments(vendorIdNum)
    }
  }

  const handleConsignmentChange = (itemId: number, consignmentId: string | null) => {
    const consignmentIdNum = consignmentId ? parseInt(consignmentId) : null
    
    setAssignments(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(itemId) || { itemId, vendorId: null, consignmentId: null }
      newMap.set(itemId, { ...existing, consignmentId: consignmentIdNum })
      return newMap
    })
  }

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item')
      return
    }

    // Validate that all selected items have vendor assignments
    const invalidItems = Array.from(selectedItems).filter(itemId => {
      const assignment = assignments.get(itemId)
      return !assignment || !assignment.vendorId
    })

    if (invalidItems.length > 0) {
      setError('All selected items must have a vendor assigned')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const token = localStorage.getItem('token')

      // Group items by vendor and consignment
      const assignmentGroups = new Map<string, number[]>()
      
      Array.from(selectedItems).forEach(itemId => {
        const assignment = assignments.get(itemId)
        if (assignment && assignment.vendorId) {
          const key = `${assignment.vendorId}-${assignment.consignmentId || 'new'}`
          const existing = assignmentGroups.get(key) || []
          assignmentGroups.set(key, [...existing, itemId])
        }
      })

      // Process each group
      const promises = Array.from(assignmentGroups.entries()).map(async ([key, itemIds]) => {
        const [vendorId, consignmentKey] = key.split('-')
        const consignmentId = consignmentKey === 'new' ? null : parseInt(consignmentKey)

        return fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/assign-vendor`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              item_ids: itemIds,
              vendor_id: parseInt(vendorId),
              consignment_id: consignmentId || undefined
            })
          }
        )
      })

      const results = await Promise.all(promises)
      const allSuccessful = results.every(r => r.ok)

      if (!allSuccessful) {
        throw new Error('Some assignments failed')
      }

      alert(`Successfully assigned vendors to ${selectedItems.size} item(s)`)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error assigning vendors:', err)
      setError(err.message || 'Failed to assign vendors')
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
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-hidden z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Assign Vendors to Items</h2>
                <p className="text-blue-100 text-sm mt-1">{auctionName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Action Bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleAllItems}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {selectedItems.size === items.length ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Select All
                  </>
                )}
              </button>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedItems.size}</span> of{' '}
                <span className="font-semibold text-gray-900">{items.length}</span> items selected
              </div>
            </div>
            <button
              onClick={() => setShowClientModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create New Client
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6">
          {loadingItems ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading items...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No items found in this auction</p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 mt-4">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    Select
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Consignment (Optional)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => {
                  const assignment = assignments.get(item.id)
                  const vendorConsignments = assignment?.vendorId ? consignmentsMap.get(assignment.vendorId) || [] : []

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedItems.has(item.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              #{item.id} - {item.title}
                            </div>
                            {item.artist_maker && (
                              <div className="text-sm text-gray-500">by {item.artist_maker}</div>
                            )}
                            {item.lot_id && (
                              <div className="text-xs text-gray-400">Lot: {item.lot_id}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                          <SearchableSelect
                            value={assignment?.vendorId?.toString() || null}
                            options={vendors
                              .filter(vendor => vendor.id !== undefined)
                              .map(vendor => {
                                const displayName = vendor.company_name || `${vendor.first_name} ${vendor.last_name}`
                                const clientId = `Client ID: ${vendor.id}`
                                const email = vendor.email || 'No email'
                                return {
                                  value: vendor.id!.toString(),
                                  label: displayName,
                                  description: `${clientId} • ${email}`
                                }
                              })}
                            placeholder={loadingVendors ? "Loading..." : "Select vendor..."}
                            onChange={(value) => handleVendorChange(item.id, value)}
                            disabled={loadingVendors}
                            inputPlaceholder="Search vendors..."
                          />
                      </td>
                      <td className="px-4 py-4">
                        {!assignment?.vendorId ? (
                          <div className="text-sm text-gray-400 italic">Select vendor first</div>
                        ) : (
                          <select
                            value={assignment?.consignmentId || ''}
                            onChange={(e) => handleConsignmentChange(item.id, e.target.value || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">-- Create New Consignment --</option>
                            {vendorConsignments.map((consignment) => (
                              <option key={consignment.id} value={consignment.id}>
                                Consignment #{consignment.id} ({consignment.status})
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.vendor_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedItems.size > 0 && (
                <span>
                  Ready to assign {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedItems.size === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5 mr-2" />
                    Assign Vendors
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Client Creation Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Create New Client</h3>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ClientForm
                mode="create"
                onSuccess={async (newClient) => {
                  // Refresh vendors list
                  await fetchVendors()
                  setShowClientModal(false)
                  if (newClient?.id) {
                    alert(`Client "${newClient.company_name || `${newClient.first_name} ${newClient.last_name}`}" created successfully!`)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

