// frontend/src/components/consignments/ReceiptItemRow.tsx
"use client"

import React from 'react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import MediaRenderer from '@/components/ui/MediaRenderer'

export interface ReceiptItemRowItemOption {
  id?: string
  lot_num?: string
  title?: string
  height_inches?: string
  width_inches?: string
  height_cm?: string
  width_cm?: string
  height_with_frame_inches?: string
  width_with_frame_inches?: string
  height_with_frame_cm?: string
  width_with_frame_cm?: string
  weight?: string
  low_est?: number
  high_est?: number
  reserve?: number
  artist_id?: string
  images?: string[]
  consignment_id?: string
}

export interface ReceiptItemRowArtistOption {
  id?: string
  name?: string
}

export interface ReceiptItem {
  id: string
  item_no: number
  artwork_id?: string
  artwork_title?: string
  artist_id?: string
  artist_name?: string
  height_inches?: string
  width_inches?: string
  height_cm?: string
  width_cm?: string
  height_with_frame_inches?: string
  width_with_frame_inches?: string
  height_with_frame_cm?: string
  width_with_frame_cm?: string
  weight?: string
  low_estimate?: number
  high_estimate?: number
  reserve?: number
}

interface Props {
  receiptItem: ReceiptItem
  items: ReceiptItemRowItemOption[]
  artists: ReceiptItemRowArtistOption[]
  users: { id: number; first_name: string; last_name: string; role: string; email: string }[]
  onChange: (id: string, field: keyof ReceiptItem, value: any) => void
  onRemove?: (id: string) => void
  onAddArtist?: () => void
  onEditArtwork?: (artworkId: string) => void
  onAddToAuction?: (artworkId: string) => void
}

export default function ReceiptItemRow({ receiptItem, items, artists, users, onChange, onRemove, onAddArtist, onEditArtwork, onAddToAuction }: Props) {
  const handleArtworkChange = (artworkId: string) => {
    // Handle "Create New" option
    if (artworkId === 'create_new') {
      onChange(receiptItem.id, 'artwork_id', 'new')
      onChange(receiptItem.id, 'artwork_title', '')
      onChange(receiptItem.id, 'height_inches', '')
      onChange(receiptItem.id, 'width_inches', '')
      onChange(receiptItem.id, 'height_cm', '')
      onChange(receiptItem.id, 'width_cm', '')
      onChange(receiptItem.id, 'height_with_frame_inches', '')
      onChange(receiptItem.id, 'width_with_frame_inches', '')
      onChange(receiptItem.id, 'height_with_frame_cm', '')
      onChange(receiptItem.id, 'width_with_frame_cm', '')
      onChange(receiptItem.id, 'weight', '')
      onChange(receiptItem.id, 'low_estimate', 0)
      onChange(receiptItem.id, 'high_estimate', 0)
      onChange(receiptItem.id, 'reserve', 0)
      onChange(receiptItem.id, 'artist_id', '')
      onChange(receiptItem.id, 'artist_name', '')
      return
    }

    // Handle clearing selection (empty value)
    if (!artworkId || artworkId === '') {
      onChange(receiptItem.id, 'artwork_id', '')
      onChange(receiptItem.id, 'artwork_title', '')
      onChange(receiptItem.id, 'height_inches', '')
      onChange(receiptItem.id, 'width_inches', '')
      onChange(receiptItem.id, 'height_cm', '')
      onChange(receiptItem.id, 'width_cm', '')
      onChange(receiptItem.id, 'height_with_frame_inches', '')
      onChange(receiptItem.id, 'width_with_frame_inches', '')
      onChange(receiptItem.id, 'height_with_frame_cm', '')
      onChange(receiptItem.id, 'width_with_frame_cm', '')
      onChange(receiptItem.id, 'weight', '')
      onChange(receiptItem.id, 'low_estimate', 0)
      onChange(receiptItem.id, 'high_estimate', 0)
      onChange(receiptItem.id, 'reserve', 0)
      onChange(receiptItem.id, 'artist_id', '')
      onChange(receiptItem.id, 'artist_name', '')
      return
    }

    // Handle existing artwork selection
    const selectedArtwork = items.find(item => String(item.id) === String(artworkId))
    if (selectedArtwork) {
      onChange(receiptItem.id, 'artwork_id', artworkId)
      onChange(receiptItem.id, 'artwork_title', selectedArtwork.title || '')
      onChange(receiptItem.id, 'height_inches', selectedArtwork.height_inches || '')
      onChange(receiptItem.id, 'width_inches', selectedArtwork.width_inches || '')
      onChange(receiptItem.id, 'height_cm', selectedArtwork.height_cm || '')
      onChange(receiptItem.id, 'width_cm', selectedArtwork.width_cm || '')
      onChange(receiptItem.id, 'height_with_frame_inches', selectedArtwork.height_with_frame_inches || '')
      onChange(receiptItem.id, 'width_with_frame_inches', selectedArtwork.width_with_frame_inches || '')
      onChange(receiptItem.id, 'height_with_frame_cm', selectedArtwork.height_with_frame_cm || '')
      onChange(receiptItem.id, 'width_with_frame_cm', selectedArtwork.width_with_frame_cm || '')
      onChange(receiptItem.id, 'weight', selectedArtwork.weight || '')
      onChange(receiptItem.id, 'low_estimate', selectedArtwork.low_est || 0)
      onChange(receiptItem.id, 'high_estimate', selectedArtwork.high_est || 0)
      onChange(receiptItem.id, 'reserve', selectedArtwork.reserve || 0)

      // Set artist information from artwork
      if ((selectedArtwork as any).artist_id) {
        const artist = artists.find(a => String(a.id) === String((selectedArtwork as any).artist_id))
        if (artist) {
          onChange(receiptItem.id, 'artist_id', String(artist.id))
          onChange(receiptItem.id, 'artist_name', artist.name || '')
        } else {
          onChange(receiptItem.id, 'artist_id', String((selectedArtwork as any).artist_id))
          onChange(receiptItem.id, 'artist_name', '')
        }
      } else {
        onChange(receiptItem.id, 'artist_id', '')
        onChange(receiptItem.id, 'artist_name', '')
      }
    } else {
      console.warn('Selected artwork not found:', artworkId)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Inventory</label>
          <SearchableSelect
            value={receiptItem.artwork_id || ''}
            onChange={(v)=>handleArtworkChange(String(v))}
            options={[{ value: 'create_new', label: '+ Create New Artwork (Manual Entry)' }, ...items.filter(item => !item.consignment_id).sort((a, b) => {
              const aId = parseInt(a.id?.toString() || '0', 10)
              const bId = parseInt(b.id?.toString() || '0', 10)
              return aId - bId
            }).map((it)=>({
              value: it.id || '',
              label: `#${it.id} - ${it.title || ''}${it.lot_num ? ` (Lot: ${it.lot_num})` : ''}`,
              description: `£${it.low_est || 0}-${it.high_est || 0}`
            }))]}
            placeholder="Select or search artwork"
          />
          {receiptItem.artwork_id === 'new' && (
            <p className="text-sm text-blue-600 mt-1">🔧 Manual entry mode: Fill in the details below manually</p>
          )}
        </div>

        {receiptItem.artwork_id === 'new' && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Artwork Title</label>
            <input
              value={receiptItem.artwork_title || ''}
              onChange={(e)=> onChange(receiptItem.id, 'artwork_title', e.target.value)}
              placeholder="Enter artwork title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
            />
          </div>
        )}

        {receiptItem.artwork_id === 'new' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Artist</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={receiptItem.artist_id || ''}
                  onChange={(v)=>{
                    if (v === '__create__') {
                      onAddArtist?.()
                      return
                    }
                    const artist = artists.find(a=> String(a.id) === String(v))
                    onChange(receiptItem.id, 'artist_id', String(v))
                    onChange(receiptItem.id, 'artist_name', artist?.name || '')
                  }}
                  options={[...artists.map((a)=>({ value: String(a.id) || '', label: a.name || '' })), { value: '__create__', label: '+ Create new artist' } ]}
                  placeholder="Search artist"
                />
                {receiptItem.artist_id && receiptItem.artist_name && (
                  <div className="text-xs text-green-600 mt-1">Selected: {receiptItem.artist_name}</div>
                )}
              </div>
              <button
                type="button"
                onClick={onAddArtist}
                className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded transition-all duration-200 ease-in-out cursor-pointer hover:scale-105 active:scale-95"
              >
                + Artist
              </button>
            </div>
          </div>
        )}

        {receiptItem.artwork_id === 'new' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={receiptItem.height_inches || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'height_inches', e.target.value)}
                  placeholder="Height (inches)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
                />
                <input
                  value={receiptItem.width_inches || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'width_inches', e.target.value)}
                  placeholder="Width (inches)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
                />
                <input
                  value={receiptItem.height_cm || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'height_cm', e.target.value)}
                  placeholder="Height (cm)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
                />
                <input
                  value={receiptItem.width_cm || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'width_cm', e.target.value)}
                  placeholder="Width (cm)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
                />
                <input
                  value={receiptItem.weight || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'weight', e.target.value)}
                  placeholder="Weight"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400 col-span-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Low Estimate (£)</label>
              <input
                type="number"
                value={receiptItem.low_estimate || ''}
                onChange={(e)=> onChange(receiptItem.id, 'low_estimate', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">High Estimate (£)</label>
              <input
                type="number"
                value={receiptItem.high_estimate || ''}
                onChange={(e)=> onChange(receiptItem.id, 'high_estimate', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reserve (£)</label>
              <input
                type="number"
                value={receiptItem.reserve || ''}
                onChange={(e)=> onChange(receiptItem.id, 'reserve', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-400"
              />
            </div>
          </>
        )}

        {/* Display artwork details when existing artwork is selected */}
        {receiptItem.artwork_id && receiptItem.artwork_id !== 'new' && (
          <div className="lg:col-span-3">
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Selected Artwork Details</h4>
                <div className="flex gap-2">
                  {onEditArtwork && (
                    <button
                      type="button"
                      onClick={() => onEditArtwork(receiptItem.artwork_id!)}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded cursor-pointer transition-all duration-200 ease-in-out shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                    >
                      Edit Artwork
                    </button>
                  )}
                  {onAddToAuction && receiptItem.artwork_id && receiptItem.artwork_id !== 'new' && (
                    <div
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onAddToAuction(receiptItem.artwork_id!)
                      }}
                      className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded flex items-center gap-1 cursor-pointer transition-all duration-200 ease-in-out shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                      style={{ pointerEvents: 'auto', zIndex: 10 }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Add to Auction
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-6">
                {/* Artwork Images */}
                <div className="flex gap-2 flex-shrink-0 max-w-[120px]">
                {(() => {
                  console.log('🔍 ReceiptItemRow - Image Debug:', {
                    artwork_id: receiptItem.artwork_id,
                    artwork_title: receiptItem.artwork_title,
                    items_count: items.length,
                    sample_item: items[0] ? {
                      id: items[0].id,
                      title: items[0].title,
                      hasImages: !!items[0].images,
                      imagesCount: items[0].images?.length || 0
                    } : 'No items'
                  })

                  const selectedArtwork = items.find(item => String(item.id) === String(receiptItem.artwork_id))

                  if (!selectedArtwork) {
                    console.warn('⚠️ No artwork found for ID:', receiptItem.artwork_id, 'in items array')
                    console.log('Available artwork IDs:', items.slice(0, 10).map(item => item.id).filter(Boolean))
                    return (
                      <div className="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                        Artwork Not Found
                      </div>
                    )
                  }

                  const images = selectedArtwork.images
                  console.log('📸 Artwork images:', {
                    artwork_id: selectedArtwork.id,
                    title: selectedArtwork.title,
                    images: images,
                    hasImages: !!images,
                    imagesLength: images?.length || 0,
                    imagesType: typeof images
                  })

                  if (!images || images.length === 0) {
                    console.warn('⚠️ No images available for artwork:', selectedArtwork.title)
                    return (
                      <div className="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                        No Images
                      </div>
                    )
                  }

                  // Filter out invalid/empty image URLs
                  const validImages = images.filter(img => img && typeof img === 'string' && img.trim() !== '')
                  console.log('✅ Valid images found:', validImages.length, 'out of', images.length)

                  if (validImages.length === 0) {
                    return (
                      <div className="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                        Invalid URLs
                      </div>
                    )
                  }

                  return (
                    <div className="flex gap-1">
                      {validImages[0] && (
                        <MediaRenderer
                          src={validImages[0]}
                          alt={`Artwork: ${selectedArtwork.title}`}
                          className="w-20 h-20 object-cover rounded border"
                          aspectRatio="square"
                          showControls={false}
                        />
                      )}
                      {validImages.length > 1 && validImages[1] && (
                        <MediaRenderer
                          src={validImages[1]}
                          alt={`Artwork: ${selectedArtwork.title} (2)`}
                          className="w-20 h-20 object-cover rounded border"
                          aspectRatio="square"
                          showControls={false}
                        />
                      )}
                    </div>
                  )
                })()}
                </div>
                
                {/* Artwork Details */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Title:</span>
                      <div className="font-medium">{receiptItem.artwork_id && receiptItem.artwork_id !== 'new' ? `#${receiptItem.artwork_id} - ` : ''}{receiptItem.artwork_title || '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Artist:</span>
                      <div className="font-medium">{receiptItem.artist_name || '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Dimensions:</span>
                      <div className="font-medium">
                        {receiptItem.height_inches && receiptItem.width_inches
                          ? `${receiptItem.height_inches}" × ${receiptItem.width_inches}"`
                          : receiptItem.height_cm && receiptItem.width_cm
                          ? `${receiptItem.height_cm}cm × ${receiptItem.width_cm}cm`
                          : receiptItem.height_inches
                          ? `${receiptItem.height_inches}" (H)`
                          : receiptItem.width_inches
                          ? `${receiptItem.width_inches}" (W)`
                          : receiptItem.height_cm
                          ? `${receiptItem.height_cm}cm (H)`
                          : receiptItem.width_cm
                          ? `${receiptItem.width_cm}cm (W)`
                          : receiptItem.weight
                          ? `${receiptItem.weight}`
                          : '—'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimate:</span>
                      <div className="font-medium">
                        {receiptItem.low_estimate || receiptItem.high_estimate 
                          ? `£${receiptItem.low_estimate || 0} - £${receiptItem.high_estimate || 0}`
                          : '—'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {onRemove && (
        <div className="flex items-center justify-end mt-3">
          <button
            type="button"
            onClick={()=> onRemove(receiptItem.id)}
            className="px-3 py-1 text-red-600 hover:text-red-800 active:text-red-900 hover:bg-red-50 active:bg-red-100 text-sm rounded transition-all duration-200 ease-in-out cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}


