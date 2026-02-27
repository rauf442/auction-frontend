// frontend/src/components/items/ItemsTableNew.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Edit, Trash2, MoreVertical, Eye } from 'lucide-react'
import { Artwork, ArtworksAPI } from '@/lib/items-api'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/items-api'
import MediaRenderer from '@/components/ui/MediaRenderer'
import ImageEditModal from '@/components/ui/ImageEditModal'
import { getAuctionsByItems } from '@/lib/auctions-api'

interface ItemsTableProps {
  items: Artwork[]
  selectedItems: string[]
  onSelectionChange: (selected: string[]) => void
  onEdit?: (item: Artwork) => void
  onDelete?: (itemId: string) => void
  onSort?: (field: string) => void
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  currentPage?: number
  currentFilters?: any
  currentLimit?: number
}

type SortField = 'id' | 'title' | 'low_est' | 'high_est' | 'start_price' | 'status' | 'category' | 'created_at'

export default function ItemsTable({
  items,
  selectedItems,
  onSelectionChange,
  onEdit,
  onDelete,
  onSort,
  sortField = 'created_at',
  sortDirection = 'desc',
  currentPage = 1,
  currentFilters = {},
  currentLimit = 25
}: ItemsTableProps) {
  const router = useRouter()

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [auctionsByItem, setAuctionsByItem] = useState<Record<string, { id: number; short_name: string; long_name: string; status: string | null; settlement_date: string | null }[]>>({})
  const [loadingAuctions, setLoadingAuctions] = useState(false)

  // ✅ FIX: Local mirror of items so image edits reflect immediately without a page refresh
  const [localItems, setLocalItems] = useState<Artwork[]>(items)

  // ✅ FIX: Keep localItems in sync when the parent passes new items (pagination, filter, etc.)
  useEffect(() => {
    setLocalItems(items)
  }, [items])

  // Image edit modal state
  const [imageEditModal, setImageEditModal] = useState<{
    isOpen: boolean
    itemId: string | null
    imageUrl: string
    imageIndex: number
    itemTitle: string
  }>({
    isOpen: false,
    itemId: null,
    imageUrl: '',
    imageIndex: 0,
    itemTitle: ''
  })

  // Fetch auctions mapping for current items
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoadingAuctions(true)
        const ids = items.map(i => i.id!).filter(Boolean)
        if (ids.length === 0) {
          setAuctionsByItem({})
          return
        }
        const mapping = await getAuctionsByItems(ids)
        setAuctionsByItem(mapping)
      } catch (e) {
        // non-blocking
        console.error('Failed to load auctions for items', e)
      } finally {
        setLoadingAuctions(false)
      }
    }
    fetchAuctions()
  }, [items])

  // Helper function to get first two images from an item
  const getItemImages = (item: Artwork): string[] => {
    if (item.images && Array.isArray(item.images)) {
      return item.images.slice(0, 2).filter(url => url && url.trim())
    }
    return []
  }

  const handleImageEdit = (item: Artwork, imageUrl: string, imageIndex: number) => {
    setImageEditModal({
      isOpen: true,
      itemId: item.id!,
      imageUrl,
      imageIndex,
      itemTitle: item.title
    })
  }

  const handleImageUpdate = async (newImageUrl: string | null, imageIndex: number) => {
    if (!imageEditModal.itemId) return

    try {
      // Get current item from localItems
      const currentItem = localItems.find(item => item.id === imageEditModal.itemId)
      if (!currentItem || !currentItem.images) return

      // Create updated images array
      const updatedImages = [...currentItem.images]

      if (newImageUrl === null) {
        // Delete image
        updatedImages.splice(imageIndex, 1)
      } else {
        // Replace image
        updatedImages[imageIndex] = newImageUrl
      }

      // Save to DB
      await ArtworksAPI.updateArtwork(imageEditModal.itemId, { images: updatedImages })

      // ✅ FIX: Update localItems immediately so the table reflects the change without a refresh
      setLocalItems(prev =>
        prev.map(item =>
          item.id === imageEditModal.itemId
            ? { ...item, images: updatedImages }
            : item
        )
      )

      // Close modal
      setImageEditModal(prev => ({ ...prev, isOpen: false }))

    } catch (error) {
      console.error('Failed to update image:', error)
      throw error // Re-throw to let the modal handle the error
    }
  }

  const handleSort = (field: SortField) => {
    onSort?.(field)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(items.map(item => item.id!))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId])
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId))
    }
  }

  const handleEdit = (item: Artwork) => {
    if (onEdit) {
      onEdit(item)
    } else {
      router.push(`/items/edit/${item.id}`)
    }
    setOpenMenuId(null)
  }

  const handleDelete = (itemId: string) => {
    if (onDelete && confirm('Are you sure you want to withdraw this item?')) {
      onDelete(itemId)
    }
    setOpenMenuId(null)
  }

  const handlePreview = (itemId: string) => {
    router.push(`/items/${itemId}`)
    setOpenMenuId(null)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 text-gray-600" /> :
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  const allSelected = selectedItems.length === items.length && items.length > 0
  const someSelected = selectedItems.length > 0

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected && !allSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>ID</span>
                  <SortIcon field="id" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Title</span>
                  <SortIcon field="title" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Category</span>
                  <SortIcon field="category" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button
                  onClick={() => handleSort('low_est')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Low Est</span>
                  <SortIcon field="low_est" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button
                  onClick={() => handleSort('high_est')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>High Est</span>
                  <SortIcon field="high_est" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button
                  onClick={() => handleSort('start_price')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Start Price</span>
                  <SortIcon field="start_price" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Created</span>
                  <SortIcon field="created_at" />
                </button>
              </th>

              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {localItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-lg font-medium">No items found</div>
                  <p className="mt-1">Try adjusting your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              localItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${selectedItems.includes(item.id!) ? 'bg-blue-50' : ''
                    }`}
                >
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id!)}
                      onChange={(e) => handleSelectItem(item.id!, e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.id}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <div
                        className="font-medium truncate cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                        onClick={() => handlePreview(item.id!)}
                        title="Click to preview"
                      >
                        {item.title}
                      </div>
                      <div className="text-gray-500 text-xs truncate">
                        {item.brands?.name || item.brand_name || 'not assigned yet'}
                      </div>
                      {/* Auctions list under brand name */}
                      <div className="mt-1 text-[11px] text-gray-600">
                        {(() => {
                          const auctions = auctionsByItem[String(item.id)] || []
                          if (loadingAuctions && auctions.length === 0) {
                            return <span className="text-gray-400">Loading auctions…</span>
                          }
                          if (auctions.length === 0) {
                            return <span className="text-gray-400">No auctions</span>
                          }
                          const names = auctions.map(a => a.short_name || a.long_name).filter(Boolean)
                          return (
                            <span title={names.join(', ')}>
                              Auctions: {names.slice(0, 3).join(', ')}{names.length > 3 ? ` +${names.length - 3}` : ''}
                            </span>
                          )
                        })()}
                      </div>
                      {(item.artist_id || item.school_id) && (
                        <div className="text-gray-500 text-xs truncate">
                          {item.artist_id ? 'Artist' : 'School'} selected
                        </div>
                      )}
                      {/* Item Images */}
                      {(() => {
                        const images = getItemImages(item)
                        if (images.length > 0) {
                          return (
                            <div className="flex space-x-1 mt-2">
                              {images.map((imageUrl, index) => (
                                <div key={index} className="relative">
                                  <MediaRenderer
                                    src={imageUrl}
                                    alt={`${item.title} - Image ${index + 1}`}
                                    className="w-24 h-24 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                                    showControls={false}
                                    aspectRatio="auto"
                                    onClick={() => handlePreview(item.id!)}
                                    showEditButton={true}
                                    onEdit={() => handleImageEdit(item, imageUrl, index)}
                                  />
                                </div>
                              ))}
                              {images.length < 2 && (
                                <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                          )
                        } else {
                          return (
                            <div className="flex space-x-1 mt-2">
                              <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                              </div>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-500 truncate" title={item.category || '-'}>
                    {item.category || '-'}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.low_est)}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.high_est)}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.start_price ? formatCurrency(item.start_price) : '-'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(item.status!)}`}>
                        {getStatusLabel(item.status!)}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* More Actions Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id!)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openMenuId === item.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                              <button
                                onClick={() => handlePreview(item.id!)}
                                className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-gray-100 cursor-pointer"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id!)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={imageEditModal.isOpen}
        onClose={() => setImageEditModal(prev => ({ ...prev, isOpen: false }))}
        currentImageUrl={imageEditModal.imageUrl}
        imageIndex={imageEditModal.imageIndex}
        itemTitle={imageEditModal.itemTitle}
        itemId={imageEditModal.itemId}
        onImageUpdate={handleImageUpdate}
      />
    </div>
  )
}