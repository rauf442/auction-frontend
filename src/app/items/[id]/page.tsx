// frontend/admin/src/app/items/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Share2, ExternalLink, Eye, Maximize2, AlertCircle, Loader2, Edit3, Calendar, User, Tag, Palette, Ruler, Info, FileText, DollarSign, Package, Clock, MapPin, Award, BookOpen, Sparkles } from 'lucide-react'
import { Artwork, ArtworksAPI, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/items-api'
import { Artist, ArtistsAPI } from '@/lib/artists-api'
import { School, SchoolsAPI } from '@/lib/schools-api'
import MediaRenderer from '@/components/ui/MediaRenderer'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export default function ItemPreviewPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [item, setItem] = useState<Artwork | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullscreenImage, setShowFullscreenImage] = useState(false)
  const [auctions, setAuctions] = useState<any[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)

  const itemId = params?.id as string

  useEffect(() => {
    loadItemData()
  }, [itemId])

  const loadItemData = async () => {
    if (!itemId) {
      setError('Item ID not found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load item
      const itemResponse = await ArtworksAPI.getArtwork(itemId)
      if (!itemResponse.success) {
        setError('Item not found')
        return
      }

      const itemData = itemResponse.data
      setItem(itemData)

      // Load related artist or school
      if (itemData.artist_id) {
        const artistResponse = await ArtistsAPI.getArtist(itemData.artist_id.toString())
        if (artistResponse.success) {
          setArtist(artistResponse.data)
        }
      } else if (itemData.school_id) {
        const schoolResponse = await SchoolsAPI.getSchool(itemData.school_id.toString())
        if (schoolResponse.success) {
          setSchool(schoolResponse.data)
        }
      }

      // Load auctions containing this item
      loadAuctionsForItem(parseInt(itemId))
    } catch (err: any) {
      setError(err.message || 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const loadAuctionsForItem = async (itemIdNum: number) => {
    try {
      setAuctionsLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/auctions?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter auctions that contain this item
        const relevantAuctions = (data.auctions || []).filter((auction: any) => 
          auction.artwork_ids && auction.artwork_ids.includes(itemIdNum)
        )
        setAuctions(relevantAuctions)
      }
    } catch (err) {
      console.error('Failed to load auctions:', err)
    } finally {
      setAuctionsLoading(false)
    }
  }

  const getItemImages = () => {
    if (!item) return []

    // Check for new images array format (unlimited images)
    if (item.images && Array.isArray(item.images)) {
      return item.images.filter(url => url && url.trim())
    }

    // Fallback to old image_file format for backward compatibility
    const images = []
    for (let i = 1; i <= 10; i++) {
      const imageUrl = item[`image_file_${i}` as keyof Artwork] as string
      if (imageUrl && imageUrl.trim()) {
        images.push(imageUrl)
      }
    }
    return images
  }

  const handlePrevImage = () => {
    const images = getItemImages()
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  const handleNextImage = () => {
    const images = getItemImages()
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item?.title || 'Artwork',
        text: `Check out this artwork: ${item?.title}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const formatDimensions = () => {
    if (!item) return null

    const dimensions = []

    // Primary dimensions
    if (item.height_inches && item.width_inches) {
      dimensions.push(`${item.height_inches}" × ${item.width_inches}"`)
    } else if (item.height_cm && item.width_cm) {
      dimensions.push(`${item.height_cm}cm × ${item.width_cm}cm`)
    }

    // With frame dimensions
    if (item.height_with_frame_inches && item.width_with_frame_inches) {
      dimensions.push(`framed: ${item.height_with_frame_inches}" × ${item.width_with_frame_inches}"`)
    } else if (item.height_with_frame_cm && item.width_with_frame_cm) {
      dimensions.push(`framed: ${item.height_with_frame_cm}cm × ${item.width_with_frame_cm}cm`)
    }

    return dimensions.length > 0 ? dimensions.join(' • ') : null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-teal-600" />
          <p className="text-xl text-gray-600 font-medium">Loading artwork...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the details</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Artwork Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested artwork could not be found'}</p>
          <button
            onClick={() => router.push('/items')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
          >
            Back to Items
          </button>
        </div>
      </div>
    )
  }

  const images = getItemImages()
  const currentImage = images[currentImageIndex]
  const dimensions = formatDimensions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Elegant Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <button
              onClick={() => router.push('/items')}
              className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-all hover:gap-4 group"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Back to Gallery</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="p-3 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push(`/items/edit/${itemId}`)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30"
              >
                <Edit3 className="h-4 w-4" />
                <span className="font-medium">Edit Artwork</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Image Gallery - Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Image with MediaRenderer */}
            <div className="relative bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-xl shadow-slate-200/50">
              {images.length > 0 ? (
                <>
                  <div className="aspect-square relative group cursor-pointer" onClick={() => setShowFullscreenImage(true)}>
                    <MediaRenderer
                      src={currentImage}
                      alt={item.title}
                      className="object-cover"
                      aspectRatio="square"
                    />
                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowFullscreenImage(true)
                      }}
                      className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-sm text-slate-800 rounded-xl hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                      title="View fullscreen"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-6 top-1/2 transform -translate-y-1/2 p-4 bg-white/95 backdrop-blur-sm text-slate-800 rounded-full hover:bg-white shadow-xl transition-all hover:scale-110"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-6 top-1/2 transform -translate-y-1/2 p-4 bg-white/95 backdrop-blur-sm text-slate-800 rounded-full hover:bg-white shadow-xl transition-all hover:scale-110"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-5 py-2.5 bg-black/70 backdrop-blur-md text-white text-sm rounded-full font-medium shadow-lg">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                  <div className="text-center text-slate-400">
                    <Eye className="h-20 w-20 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-semibold">No Image Available</p>
                    <p className="text-sm mt-2">This artwork doesn't have any images yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-6 gap-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-xl border-2 overflow-hidden transition-all transform hover:scale-105 ${
                      index === currentImageIndex
                        ? 'border-teal-500 ring-4 ring-teal-100 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <MediaRenderer
                      src={image}
                      alt={`${item.title} - ${index + 1}`}
                      className="object-cover"
                      aspectRatio="square"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details - Right Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hero Card - Title & Artist */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-8 shadow-xl border border-slate-200/60">
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-6">
                <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${getStatusColor(item.status!)}`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {getStatusLabel(item.status!)}
                </span>
                {item.id && (
                  <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-xl font-medium">
                    #ID {String(item.id)}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">{item.title}</h1>

              {/* Artist/School Info */}
              {(artist || school) && (
                <div className="mb-8 p-5 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl border border-teal-200/50">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-white rounded-lg shadow-sm">
                      <User className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      {artist && (
                        <>
                          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Artist</p>
                          <p className="text-xl font-bold text-slate-900">{artist.name}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                            {(artist.birth_year || artist.death_year) && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {artist.birth_year || '?'}{artist.death_year ? `-${artist.death_year}` : artist.birth_year ? '-' : ''}
                              </span>
                            )}
                            {artist.nationality && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {artist.nationality}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {school && (
                        <>
                          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">School</p>
                          <p className="text-xl font-bold text-slate-900">{school.name}</p>
                          {school.location && (
                            <p className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                              <MapPin className="h-4 w-4" />
                              {school.location}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Estimates */}
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-emerald-700" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Estimate</span>
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                    {formatCurrency(item.low_est)} - {formatCurrency(item.high_est)}
                  </div>
                </div>
                
                {item.start_price && (
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Starting Bid</span>
                      <span className="text-xl font-bold text-slate-900">{formatCurrency(item.start_price)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200/60">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Description</h3>
                </div>
                <div className="prose prose-slate max-w-none">
                  <div 
                    className="text-slate-700 leading-relaxed text-base"
                    dangerouslySetInnerHTML={{ __html: item.description.replace(/<br\s*\/?>/gi, '<br />') }}
                  />
                </div>

                {/* Condition Report */}
                {item.condition_report && (
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="h-5 w-5 text-amber-600" />
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Condition Report</h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-amber-50/50 p-4 rounded-xl border border-amber-100">{item.condition_report}</p>
                  </div>
                )}
              </div>
            )}

            {/* Artwork Specifications */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200/60">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Specifications</h3>
              </div>
              
              {/* Primary Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {item.category && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="h-4 w-4 text-slate-500" />
                      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Category</dt>
                    </div>
                    <dd className="text-lg text-slate-900 font-semibold">{item.category}</dd>
                  </div>
                )}

                {item.materials && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="h-4 w-4 text-slate-500" />
                      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Materials</dt>
                    </div>
                    <dd className="text-lg text-slate-900 font-semibold">{item.materials}</dd>
                  </div>
                )}

                {dimensions && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="h-4 w-4 text-slate-500" />
                      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dimensions</dt>
                    </div>
                    <dd className="text-lg text-slate-900 font-semibold">{dimensions}</dd>
                  </div>
                )}

                {item.period_age && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Period</dt>
                    </div>
                    <dd className="text-lg text-slate-900 font-semibold">{item.period_age}</dd>
                  </div>
                )}

                {item.condition && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-slate-500" />
                      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Condition</dt>
                    </div>
                    <dd className="text-lg text-slate-900 font-semibold">{item.condition}</dd>
                  </div>
                )}

                {item.lot_num && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-slate-500" />
                      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lot Number</dt>
                    </div>
                    <dd className="text-lg text-slate-900 font-semibold">{item.lot_num}</dd>
                  </div>
                )}
              </div>

              {/* Provenance */}
              {item.provenance && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-purple-600" />
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Provenance</h4>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-purple-50/50 p-5 rounded-xl border border-purple-100">{item.provenance}</p>
                </div>
              )}

              {/* Technical Measurements */}
              {((item.height_inches || item.height_cm) || (item.width_inches || item.width_cm) || item.weight) && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Technical Measurements</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {(item.height_inches || item.height_cm) && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Height</p>
                        {item.height_inches && (
                          <p className="text-lg text-slate-900 font-bold">{item.height_inches}"</p>
                        )}
                        {item.height_cm && (
                          <p className="text-sm text-slate-600">{item.height_cm} cm</p>
                        )}
                      </div>
                    )}

                    {(item.width_inches || item.width_cm) && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Width</p>
                        {item.width_inches && (
                          <p className="text-lg text-slate-900 font-bold">{item.width_inches}"</p>
                        )}
                        {item.width_cm && (
                          <p className="text-sm text-slate-600">{item.width_cm} cm</p>
                        )}
                      </div>
                    )}

                    {item.weight && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Weight</p>
                        <p className="text-lg text-slate-900 font-bold">{item.weight}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Frame Details */}
              {(item.height_with_frame_inches || item.height_with_frame_cm) && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Frame Dimensions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(item.height_with_frame_inches || item.width_with_frame_inches) && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Framed Size</p>
                        {item.height_with_frame_inches && item.width_with_frame_inches && (
                          <p className="text-lg text-slate-900 font-bold">{item.height_with_frame_inches}" × {item.width_with_frame_inches}"</p>
                        )}
                        {item.height_with_frame_cm && item.width_with_frame_cm && (
                          <p className="text-sm text-slate-600 mt-1">{item.height_with_frame_cm}cm × {item.width_with_frame_cm}cm</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push(`/items/edit/${itemId}`)}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 font-semibold text-base transition-all shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 hover:scale-[1.02]"
                >
                  <Edit3 className="h-5 w-5" />
                  Edit Artwork
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 font-semibold text-base transition-all hover:scale-[1.02]"
                >
                  <Share2 className="h-5 w-5" />
                  Share
                </button>
              </div>
              
              {/* Private Sale Invoice Button */}
              {item.status !== 'sold' && auctions.length > 0 && (
                <button
                  onClick={() => router.push(`/invoices/private-sale?item_id=${itemId}`)}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-purple-800 font-semibold text-base transition-all shadow-lg shadow-purple-600/20 hover:shadow-xl hover:shadow-purple-600/30 hover:scale-[1.02]"
                >
                  <FileText className="h-5 w-5" />
                  Create Private Sale Invoice
                </button>
              )}
            </div>

            {/* Auction & Pricing Details */}
            {(item.reserve || item.final_price) && (
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200/60">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Auction Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {item.reserve && (
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/50 text-center">
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-2">Reserve Price</p>
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency(item.reserve)}</p>
                    </div>
                  )}
                  {item.final_price && (
                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200/50 text-center">
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Final Price</p>
                      <p className="text-3xl font-bold text-green-600">{formatCurrency(item.final_price)}</p>
                    </div>
                  )}
                </div>
                {item.date_sold && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-4 rounded-xl">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">
                        Sold on {new Date(item.date_sold).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Meta Information */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-8 border border-slate-200/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Info className="h-5 w-5 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Record Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-4">
                  {item.created_at && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 bg-white p-4 rounded-xl">
                      <Calendar className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Created</p>
                        <p>
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {item.updated_at && item.updated_at !== item.created_at && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 bg-white p-4 rounded-xl">
                      <Calendar className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Last Updated</p>
                        <p>
                          {new Date(item.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {item.id && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 bg-white p-4 rounded-xl">
                      <Tag className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Database ID</p>
                        <p className="font-mono">{String(item.id)}</p>
                      </div>
                    </div>
                  )}
                  {item.status && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 bg-white p-4 rounded-xl">
                      <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Status</p>
                        <p>{getStatusLabel(item.status)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && currentImage && (
        <div className="fixed inset-0 bg-black/97 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative max-w-full max-h-full">
            <MediaRenderer
              src={currentImage}
              alt={item.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setShowFullscreenImage(false)}
              className="absolute -top-4 -right-4 p-4 bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-all shadow-xl hover:scale-110"
              title="Close"
            >
              <span className="text-xl font-bold">✕</span>
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 p-5 bg-white/95 backdrop-blur-sm text-slate-900 rounded-full hover:bg-white shadow-2xl transition-all hover:scale-110"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 p-5 bg-white/95 backdrop-blur-sm text-slate-900 rounded-full hover:bg-white shadow-2xl transition-all hover:scale-110"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-white/95 backdrop-blur-md text-slate-900 text-base rounded-full font-bold shadow-2xl">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
