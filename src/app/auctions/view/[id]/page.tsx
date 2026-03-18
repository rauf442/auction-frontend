// frontend/src/app/auctions/view/[id]/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, MapPin, Trophy, Download, Upload,
  FileText, Package, Edit, ExternalLink, ChevronDown, Eye, Share2 , Import
} from 'lucide-react'
import { getAuction, isAuctionPast } from '@/lib/auctions-api'
import { ArtworksAPI } from '@/lib/items-api'
import AuctionExportDialog from '@/components/auctions/AuctionExportDialog'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'
import UnifiedCatalogGenerator from '@/components/items/PDFCatalogGenerator'
import MediaRenderer from '@/components/ui/MediaRenderer'

import type { Auction } from '@/lib/auctions-api'

interface AuctionArtwork {
  id: string
  lot_num?: string | number
  title: string
  artist_maker?: string
  low_est?: number
  high_est?: number
  images?: string[] // Unlimited images array
  image_file_1?: string // Keep for backward compatibility
  image_file_2?: string
  condition?: string
  dimensions?: string
  status?: 'draft' | 'active' | 'sold' | 'withdrawn' | 'passed' | 'returned'
  hammer_price?: number
  sale_price?: number // Sale price from EOA import
  is_private_sale?: boolean // Flag for private sales
}

export default function AuctionViewPage() {
  const router = useRouter()
  const params = useParams()
  const auctionId = params.id as string

  const [auction, setAuction] = useState<Auction | null>(null)
  const [artworks, setArtworks] = useState<AuctionArtwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showEOADialog, setShowEOADialog] = useState(false)
  const [showCatalogGenerator, setShowCatalogGenerator] = useState(false)
  const [showUrlMenu, setShowUrlMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL? `${process.env.NEXT_PUBLIC_API_URL}/api`: 'http://localhost:3001/api';
  const [liveAuctioneerId, setLiveAuctioneerId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [originalLiveAuctioneerId, setOriginalLiveAuctioneerId] = useState<string | null>(null);



  const loadAuctionDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading auction with ID:', auctionId)

      // Use the specific auction endpoint - no brand filtering for individual auction views
      const foundAuction = await getAuction(auctionId)

      console.log('Found auction:', foundAuction.id, foundAuction.short_name)

      setAuction(foundAuction)

      // Load artworks for this auction using the auction's artwork_ids array
      if (foundAuction.artwork_ids && Array.isArray(foundAuction.artwork_ids) && foundAuction.artwork_ids.length > 0) {
        try {
          const artworksResponse = await ArtworksAPI.getArtworks({
            item_ids: foundAuction.artwork_ids.map(id => id.toString()),
            page: 1,
            limit: 1000,
            status: 'all'
          })

          if (artworksResponse && artworksResponse.data && Array.isArray(artworksResponse.data)) {
            const auctionArtworks = artworksResponse.data
              .filter(artwork => artwork.id)
              .map(artwork => ({
                ...artwork,
                id: artwork.id!
              }))
              // Sort artworks to match the order in auction.artwork_ids
              .sort((a, b) => {
                const indexA = foundAuction.artwork_ids?.indexOf(parseInt(a.id)) ?? -1
                const indexB = foundAuction.artwork_ids?.indexOf(parseInt(b.id)) ?? -1
                return indexA - indexB
              })
            setArtworks(auctionArtworks)
          } else {
            setArtworks([])
          }
        } catch (artworkError) {
          console.error('Error loading artworks:', artworkError)
          // Don't set error state for artworks, just show empty list
          setArtworks([])
        }
      } else {
        setArtworks([])
      }

    } catch (err: any) {
      console.error('Error loading auction details:', err)
      if (err.message && err.message.includes('not found')) {
        setError('Auction not found')
      } else {
        setError(err?.message || 'Failed to load auction details')
      }
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    if (auctionId) {
      loadAuctionDetails();
    }
  }, [auctionId, loadAuctionDetails]);

  
  // Close URL menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUrlMenu && !(event.target as Element).closest('.url-menu-container')) {
        setShowUrlMenu(false)
      }
      if (showShareMenu && !(event.target as Element).closest('.share-menu-container')) {
        setShowShareMenu(false)
      }
    }

    if (showUrlMenu || showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUrlMenu, showShareMenu])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not set'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getDynamicStatusLabel = (auction: Auction) => {
    const today = new Date()
    const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
    const settlementDate = new Date(auction.settlement_date)

    if (today > settlementDate) {
      return 'Past'
    } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
      return 'Present'
    } else {
      return 'Future'
    }
  }
  useEffect(() => {
      if (auction?.id) {
        fetchLiveAuctioneerId();
      }
  }, [auction]);

  const getArtworkStatusBadge = (artwork: AuctionArtwork, auction: Auction) => {
    // If artwork is sold privately
    if (artwork.status === 'sold' && artwork.is_private_sale) {
      return {
        text: artwork.sale_price ? `Sold Privately at ${formatCurrency(artwork.sale_price)}` : 'Sold Privately',
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      }
    }

    // If artwork is sold (regular) - check for any sale price field
    if (artwork.status === 'sold') {
      const salePrice = artwork.sale_price || artwork.hammer_price;
      if (salePrice) {
        return {
          text: `Sold at ${formatCurrency(salePrice)}`,
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      } else {
        return {
          text: 'Sold',
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      }
    }


    // If auction is past and artwork is not sold
    if (isAuctionPast(auction)) {
      return {
        text: 'Lot Passed',
        color: 'bg-red-100 text-red-800 border-red-200'
      }
    }

    // If auction is still active and artwork is not sold
    if (!isAuctionPast(auction)) {
      return {
        text: 'Ongoing',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      }
    }

    // Default fallback for other statuses
    return {
      text: artwork.status ? artwork.status.charAt(0).toUpperCase() + artwork.status.slice(1) : 'Unknown',
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDynamicStatusColor = (auction: Auction) => {
    const today = new Date()
    const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
    const settlementDate = new Date(auction.settlement_date)

    if (today > settlementDate) {
      return 'bg-red-500 text-white'
    } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
      return 'bg-green-500 text-white'
    } else {
      return 'bg-blue-500 text-white'
    }
  }

  const handleImportEOA = () => {
    setShowEOADialog(true)
  }

  const handleGenerateInvoice = () => {
    router.push(`/auctions/${auctionId}/invoices`)
  }

const handlePreview = (artworkId: string) => {
  sessionStorage.setItem('itemsBackUrl', `/auctions/view/${auctionId}`)
  router.push(`/items/${artworkId}`)
}

  
  // Handle sharing auction
  const handleShare = (method: 'email' | 'whatsapp' | 'message') => {
    if (!auction) return

    const auctionUrl = getAvailableUrls().length > 0 ? getAvailableUrls()[0].url : window.location.href
    const auctionTitle = auction.long_name || auction.short_name
    const shareText = `Check out this auction: ${auctionTitle}\n${auctionUrl}`

    switch (method) {
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(auctionTitle)}&body=${encodeURIComponent(shareText)}`)
        break
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
        break
      case 'message':
        // For iOS Safari, try to use SMS
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
          window.open(`sms:&body=${encodeURIComponent(shareText)}`)
        } else {
          // Fallback to general messaging
          navigator.share?.({
            title: auctionTitle,
            text: shareText,
            url: auctionUrl
          }).catch(() => {
            // Fallback if Web Share API not supported
            window.open(`mailto:?subject=${encodeURIComponent(auctionTitle)}&body=${encodeURIComponent(shareText)}`)
          })
        }
        break
    }
    setShowShareMenu(false)
  }

  // Get available auction URLs
  const getAvailableUrls = useCallback(() => {
    if (!auction) return []

    const urls = [
      { platform: 'LiveAuctioneers', url: auction.liveauctioneers_url, key: 'liveauctioneers_url' },
      { platform: 'EasyLive', url: auction.easy_live_url, key: 'easy_live_url' },
      { platform: 'Invaluable', url: auction.invaluable_url, key: 'invaluable_url' },
      { platform: 'The Saleroom', url: auction.the_saleroom_url, key: 'the_saleroom_url' }
    ].filter(item => item.url && item.url.trim() !== '')

    return urls
  }, [auction])

  // Handle viewing auction URLs
  const handleViewAuction = useCallback(() => {
    const availableUrls = getAvailableUrls()

    if (availableUrls.length === 0) {
      // No URLs available
      toast.warning('No auction URLs have been configured for this auction.')
      return
    }

    if (availableUrls.length === 1) {
      // Only one URL, navigate directly
      window.open(availableUrls[0].url, '_blank')
    } else {
      // Multiple URLs, show menu
      setShowUrlMenu(!showUrlMenu)
    }
  }, [getAvailableUrls, showUrlMenu])

  // Handle selecting a specific URL from menu
  const handleUrlSelect = useCallback((url: string) => {
    window.open(url, '_blank')
    setShowUrlMenu(false)
  }, [])


  const updateLiveAuctioneerId = async (newId: string) => {
    if (!auction?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auctions/liveauctioneer-update/${auction.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveAuctioneerId: newId }),
      });

      const data = await response.json();
      if (data.success) {
        setLiveAuctioneerId(data.liveAuctioneerId);
        toast.success('✅ Live Auctioneer ID updated successfully');
      } else {
        toast.error(`❌ Failed to update: ${data.message}`);
      }
    } catch (err) {
      console.error('Error updating Live Auctioneer ID:', err);
      toast.error('❌ Error updating Live Auctioneer ID. Check console.');
    }
  };
  const fetchLiveAuctioneerId = async () => {
    if (!auction?.id) {
      console.log('[fetchLiveAuctioneerId] No auction ID available yet');
      return;
    }

    console.log('[fetchLiveAuctioneerId] Fetching Live Auctioneer ID for auction:', auction.id);

    try {
      const response = await fetch(`${API_BASE_URL}/auctions/liveauctioneer-get/${auction.id}`);
      console.log('[fetchLiveAuctioneerId] Fetch response:', response);

      const data = await response.json();
      console.log('[fetchLiveAuctioneerId] Response JSON:', data);

      if (data.success) {
        console.log('[fetchLiveAuctioneerId] Setting liveAuctioneerId:', data.liveAuctioneerId);
        setLiveAuctioneerId(data.liveAuctioneerId);
        setOriginalLiveAuctioneerId(data.liveAuctioneerId); // store original

      } else {
        console.error('[fetchLiveAuctioneerId] Failed to fetch Live Auctioneer ID:', data.message);
        setLiveAuctioneerId(null);
        setOriginalLiveAuctioneerId(null);
      }
    } catch (err) {
      console.error('[fetchLiveAuctioneerId] Error fetching Live Auctioneer ID:', err);
      setLiveAuctioneerId(null);
      setOriginalLiveAuctioneerId(null);
    }
  };

  const handleSyncWithLiveAuction = async () => {
    if (!auction?.id) {
      toast.error('❌ No auction selected.');
      return;
    }
    if (!liveAuctioneerId) {
      toast.error('❌ This auction does not have a Live Auctioneer ID set.');
      return;
    }

    try {
      setSyncing(true);
      const syncResponse = await fetch(
        `${API_BASE_URL}/auctions/updateinventory-live/${auction.id}`,
        { method: 'GET' }
      );

      const syncData = await syncResponse.json();

      if (syncData.success) {
        toast.success('✅ Auction synced successfully');
        loadAuctionDetails(); // refresh auction data
      } else {
        toast.error(`❌ Failed to sync auction: ${syncData.message}`);
      }
    } catch (err) {
      console.error('Error syncing auction:', err);
      toast.error('❌ Error syncing auction. Check console.');
    } finally {
      setSyncing(false);
    }
  };  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading auction details...</span>
      </div>
    )
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Auction not found'}</p>
          <button
            onClick={() => router.push('/auctions')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Compact Actions */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Title Section */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/auctions')}
                  className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{auction.long_name || auction.short_name}</h1>
                  <p className="text-gray-600 mt-1">{auction.short_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-sm ${getDynamicStatusColor(auction)}`}>
                  <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></div>
                  {getDynamicStatusLabel(auction)}
                </span>
              </div>
            </div>

            {/* Compact Actions Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
              </div>

              {/* Primary Actions */}
              <div className="relative url-menu-container">
                <button
                  onClick={handleViewAuction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 cursor-pointer"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Auction
                  {getAvailableUrls().length > 1 && (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </button>

                {/* URL Selection Menu */}
                {showUrlMenu && getAvailableUrls().length > 1 && (
                  <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      {getAvailableUrls().map((urlItem, _index) => (
                        <button
                          key={urlItem.key}
                          onClick={() => handleUrlSelect(urlItem.url!)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center space-x-3 cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium text-gray-900">{urlItem.platform}</div>
                            <div className="text-xs text-gray-500 truncate max-w-48">{urlItem.url}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push(`/auctions/edit/${auctionId}`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Auction
              </button>

              <button
                onClick={() => router.push('/items')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm border border-gray-300 cursor-pointer"
              >
                <Package className="h-4 w-4 mr-2" />
                Manage Items
              </button>

              {/* Share Button with Menu */}
              <div className="relative share-menu-container">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>

                {/* Share Menu */}
                {showShareMenu && (
                  <div className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => handleShare('email')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 cursor-pointer"
                      >
                        <span className="text-lg">📧</span>
                        <span className="font-medium text-gray-900">Email</span>
                      </button>
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 cursor-pointer"
                      >
                        <span className="text-lg">💬</span>
                        <span className="font-medium text-gray-900">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => handleShare('message')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 cursor-pointer"
                      >
                        <span className="text-lg">📱</span>
                        <span className="font-medium text-gray-900">Message</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary Actions */}
              <div className="border-l border-gray-300 pl-3 ml-2 flex items-center space-x-2">
                <button
                  onClick={handleImportEOA}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Import EOA
                </button>

                <button
                  onClick={handleGenerateInvoice}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Invoice
                </button>

                <button
                  onClick={() => setShowExportDialog(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </button>

                <button
                  onClick={() => setShowCatalogGenerator(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Catalog
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

          {/* Auction Information and Quick Stats - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Auction Information */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Auction Information</h2>
                    <p className="text-sm text-gray-500">Event details and timeline</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Catalogue Launch */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Calendar className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Catalogue Launch</h3>
                        <p className="text-gray-600 text-sm mb-2">When bidding opens</p>
                        <p className="text-lg font-medium text-gray-900">
                          {formatDate(auction.catalogue_launch_date || auction.settlement_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Settlement Date */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <Clock className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Settlement Date</h3>
                        <p className="text-gray-600 text-sm mb-2">Final bidding deadline</p>
                        <p className="text-lg font-medium text-gray-900">
                          {formatDate(auction.settlement_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Date */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <MapPin className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Preview Date</h3>
                        <p className="text-gray-600 text-sm mb-2">Physical viewing starts</p>
                        <p className="text-lg font-medium text-gray-900">
                          {formatDate(auction.shipping_date || auction.catalogue_launch_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auction Type */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Trophy className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Auction Type</h3>
                        <p className="text-gray-600 text-sm mb-2">Category of sale</p>
                        <p className="text-lg font-medium text-gray-900 capitalize">
                          {auction.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                    <div className="flex gap-4 flex-col items-start space-y-2 sm:space-y-0 sm:space-x-3 mt-3 md:mt-0 w-full md:justify-between">
                      <div className="flex space-x-2 items-center w-full">
                        <input
                          id="liveauctioneerId"
                          type="text"
                          value={liveAuctioneerId || ''}
                          onChange={(e) => setLiveAuctioneerId(e.target.value)}
                          placeholder="Enter Auction ID"
                          style={{maxWidth:'300px'}}
                          className="px-3 py-2 rounded-md w-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        
                          <button
                            onClick={() => liveAuctioneerId && updateLiveAuctioneerId(liveAuctioneerId)}
                            style={{maxWidth:'100px'}}
                            className="w-full inline-flex text-green-600 items-center rounded-md border border-slate-200 bg-green-100 hover:bg-green-300 px-4 py-2 text-sm font-semibold transition"
                          >
                            Save
                          </button>
                        
                      </div>
                      <button
                        onClick={handleSyncWithLiveAuction}
                        style={{maxWidth:"300px"}}
                        className={`w-full max-w-xl inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold transition
                          ${syncing
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        disabled={syncing} // disable button while syncing
                      >
                      <Import className="mr-2 h-4 w-4" />
                      {syncing ? 'Syncing...' : 'Sync Product prices from Auction'}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      (This process may take some time depending on the size of the auction catalog.)
                    </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {auction.description && (
                  <div className="mt-8 p-4 bg-white rounded-lg border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-500" />
                      Description
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{auction.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
                    <p className="text-sm text-slate-300">Auction overview</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-6 space-y-4">
                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-sm ${getDynamicStatusColor(auction)}`}>
                    <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></div>
                    {getDynamicStatusLabel(auction)} Auction
                  </span>
                </div>

                {/* Total Lots */}
                <div className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Package className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Total Lots</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {auction.artwork_ids?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Available Items */}
                <div className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        {/* <Eye className="h-4 w-4 text-blue-400" /> */}
                        <Package className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Available Items</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {artworks.length}
                    </span>
                  </div>
                </div>

                {/* Catalog Coverage */}
                <div className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Catalog Coverage</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {auction.artwork_ids?.length ? Math.round((artworks.length / auction.artwork_ids.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Publication Status */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-slate-300 font-medium">Publication Status</span>
                  </div>
                  <div className="ml-11">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${auction.upload_status === 'uploaded' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className="text-white font-semibold">
                        {auction.upload_status === 'uploaded' ? 'Published' : 'Not Published'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Artworks - Full Width */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Featured Artworks</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {artworks.length} items in catalog
                </span>
                {getAvailableUrls().length > 0 && (
                  <button
                    onClick={handleViewAuction}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-all duration-200 hover:shadow-md transform hover:scale-105 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {getAvailableUrls().length === 1 ? 'View Auction' : `View on ${getAvailableUrls()[0].platform}`}
                  </button>
                )}
              </div>
            </div>

            {artworks.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No artworks assigned to this auction yet.</p>
                <p className="text-gray-500 text-sm mt-2">Items will appear here once they're added to the catalog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-8">
                {artworks.map((artwork, index) => {
                  // Calculate lot number based on position in artwork_ids array + 1
                  const lotNumber = auction.artwork_ids ? auction.artwork_ids.indexOf(parseInt(artwork.id)) + 1 : index + 1;

                  return (
                    <div
                      key={artwork.id}
                      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300 cursor-pointer"
                      onClick={() => handlePreview(artwork.id)}
                    >
                      {/* Artwork Image */}
                      <MediaRenderer
                        src={artwork.images && artwork.images.length > 0 ? artwork.images[0] : artwork.image_file_1 || ''}
                        alt={artwork.title}
                        aspectRatio="square"
                        showControls={false}
                      />

                      {/* Artwork Details */}
                      <div className="p-4">
                        <div className="space-y-3">
                          {/* Title with Lot Number */}
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                            {lotNumber.toString().padStart(4, '0')}: {artwork.title}
                          </h3>

                          {/* Artist */}
                          {artwork.artist_maker && (
                            <p className="text-sm text-gray-600 font-medium">
                              {artwork.artist_maker}
                            </p>
                          )}

                          {/* Estimates */}
                          {(artwork.low_est || artwork.high_est) && (
                            <div className="space-y-2">
                              <p className="text-sm font-bold text-gray-900">
                                Est. {formatCurrency(artwork.low_est)} - {formatCurrency(artwork.high_est)}
                              </p>

                              {/* Status Badge */}
                              {(() => {
                                const statusBadge = getArtworkStatusBadge(artwork, auction);
                                return (
                                  <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${statusBadge.color}`}>
                                    {statusBadge.text}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Additional Details */}
                          <div className="space-y-1">
                            {artwork.dimensions && (
                              <p className="text-xs text-gray-500">
                                {artwork.dimensions}
                              </p>
                            )}
                            {artwork.condition && (
                              <p className="text-xs text-gray-500">
                                Condition: {artwork.condition}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuctionExportDialog
            onClose={() => setShowExportDialog(false)}
            selectedAuctions={[parseInt(auctionId)]}
          />
        </div>
      )}

      {/* Catalog Generator */}
      {showCatalogGenerator && (
        <UnifiedCatalogGenerator
          selectedArtworks={artworks.map(artwork => ({
            id: artwork.id,
            title: artwork.title || '',
            description: '', // Auction artworks don't have description in this interface
            low_est: artwork.low_est,
            high_est: artwork.high_est,
            condition: artwork.condition,
            dimensions: artwork.dimensions,
            status: artwork.status,
            images: artwork.images || [],
            // Map artist_maker to artist_id if it's a number
            artist_id: typeof artwork.artist_maker === 'string' && !isNaN(parseInt(artwork.artist_maker))
              ? parseInt(artwork.artist_maker)
              : undefined,
            // Other fields that might be available
            lot_num: artwork.lot_num
          }))}
          onClose={() => setShowCatalogGenerator(false)}
          source="auctions"
          customTitle={auction?.short_name || auction?.long_name}
        />
      )}

      {/* EOA Import Dialog */}
      {showEOADialog && (
        <EOAImportDialog
          auctionId={parseInt(auctionId)}
          onClose={() => setShowEOADialog(false)}
          onImportComplete={(importedCount) => {
            console.log(`Imported ${importedCount} EOA records`)
          }}
        />
      )}
    </div>
  )
}