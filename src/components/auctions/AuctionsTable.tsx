"use client"

import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { ChevronUp, ChevronDown, Edit, Trash2, Eye, FileText, Upload, MoreVertical, Plus, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AUCTION_SUBTYPES } from '@/lib/constants'
import { generatePassedAuctionBulk, getBrandAuctionCounts, getAuctionUnsoldCounts, type Brand } from '@/lib/auctions-api'

interface Auction {
  id: number
  number: string
  short_name: string
  long_name: string
  type: string
  lots: number
  endingDate: string
  catalogue_launch_date?: string
  settlement_date: string
  upload_status?: string
  brand?: {
    id: number
    code: string
    name: string
  }
  platform?: string
}

interface AuctionsTableProps {
  auctions: Auction[]
  selectedAuctions: number[]
  onSelectionChange: (selected: number[]) => void
  onView?: (auctionId: number) => void
  onEdit?: (auctionId: number) => void
  onDelete?: (auctionId: number) => void
  onImportEOA?: (auctionId: number) => void
  onGenerateInvoice?: (auctionId: number) => void
  onGeneratePassedAuction?: (auctionId: number, subtype: string) => void
  brands?: Brand[]
}

type SortField = keyof Auction

// Dynamic status calculation based on dates
const getAuctionStatus = (auction: Auction) => {
  const today = new Date()
  const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
  const settlementDate = new Date(auction.settlement_date)

  if (today > settlementDate) {
    return { status: 'Past', color: 'bg-red-100 text-red-800 border border-red-200' }
  } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
    return { status: 'Present', color: 'bg-green-100 text-green-800 border border-green-200' }
  } else {
    return { status: 'Future', color: 'bg-blue-100 text-blue-800 border border-blue-200' }
  }
}

interface AuctionsTablePropsExtended extends AuctionsTableProps {
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  currentSortField?: string
  currentSortDirection?: 'asc' | 'desc'
  onGeneratePassedAuctionBulk?: (auctionIds: number[]) => void
}

const AuctionsTable = forwardRef<
  { handleGeneratePassedAuction: (auctionIds: number[]) => void },
  AuctionsTablePropsExtended
>(({
  auctions,
  selectedAuctions,
  onSelectionChange,
  onView,
  onEdit,
  onDelete,
  onImportEOA,
  onGenerateInvoice,
  onGeneratePassedAuction,
  onSort,
  currentSortField = 'id',
  currentSortDirection = 'asc',
  brands = [],
  onGeneratePassedAuctionBulk
}, ref) => {
  const router = useRouter()
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)
  const [passedAuctionDialogOpen, setPassedAuctionDialogOpen] = useState<boolean>(false)
  const [selectedAuctionsForPassed, setSelectedAuctionsForPassed] = useState<Auction[]>([])
  const [generatingPassedAuction, setGeneratingPassedAuction] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [passedAuctionShortName, setPassedAuctionShortName] = useState('')
  const [passedAuctionLongName, setPassedAuctionLongName] = useState('')
  const [passedAuctionStartDate, setPassedAuctionStartDate] = useState('')
  const [passedAuctionSettlementDate, setPassedAuctionSettlementDate] = useState('')
  const [brandAuctionCounts, setBrandAuctionCounts] = useState<{ [brandId: number]: number }>({})
  const [brandSelectionError, setBrandSelectionError] = useState<string | null>(null)
  const [unsoldCounts, setUnsoldCounts] = useState<{ [auctionId: number]: number }>({})
  const [totalUnsoldCount, setTotalUnsoldCount] = useState(0)
  const [loadingUnsoldCounts, setLoadingUnsoldCounts] = useState(false)

  // Expose handleGeneratePassedAuction via ref
  useImperativeHandle(ref, () => ({
    handleGeneratePassedAuction
  }))

  // Helper function to get next month's first and last day
  const getNextMonthDates = () => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0)

    const formatDateForInput = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}T00:00`
    }

    return {
      start: formatDateForInput(nextMonth),
      end: formatDateForInput(lastDay)
    }
  }

  // Helper function to get brand info from selected auctions
  const getSelectedBrandInfo = React.useCallback((selectedIds: number[]) => {
    const selectedAuctionObjects = auctions.filter(auction => selectedIds.includes(auction.id))
    const brandIds = [...new Set(selectedAuctionObjects.map(a => a.brand?.id).filter(Boolean))]
    const brandNames = [...new Set(selectedAuctionObjects.map(a => a.brand?.name).filter(Boolean))]
    return { brandIds, brandNames, auctions: selectedAuctionObjects }
  }, [auctions])

  // Helper function to validate brand consistency
  const validateBrandConsistency = React.useCallback((selectedIds: number[]): { isValid: boolean; error?: string } => {
    const { brandIds, brandNames } = getSelectedBrandInfo(selectedIds)

    if (brandIds.length === 0) {
      return { isValid: true } // No auctions or no brands assigned - allow
    }

    if (brandIds.length > 1) {
      return {
        isValid: false,
        error: `Cannot select auctions from different brands. Selected brands: ${brandNames.join(', ')}. Please select auctions from the same brand only.`
      }
    }

    return { isValid: true }
  }, [getSelectedBrandInfo])

  // Load unsold counts for selected auctions
  const loadUnsoldCounts = React.useCallback(async (selectedIds: number[]) => {
    if (selectedIds.length === 0) {
      setUnsoldCounts({})
      setTotalUnsoldCount(0)
      return
    }

    try {
      setLoadingUnsoldCounts(true)
      const response = await getAuctionUnsoldCounts(selectedIds)
      if (response.success) {
        setUnsoldCounts(response.counts)
        setTotalUnsoldCount(response.total)
      }
    } catch (error) {
      console.error('Error loading unsold counts:', error)
      setUnsoldCounts({})
      setTotalUnsoldCount(0)
    } finally {
      setLoadingUnsoldCounts(false)
    }
  }, [])

  // Load brand auction counts when brands change
  React.useEffect(() => {
    const loadBrandAuctionCounts = async () => {
      if (brands.length > 0) {
        try {
          const countsResponse = await getBrandAuctionCounts(brands)
          setBrandAuctionCounts(countsResponse || {})
        } catch (error) {
          console.error('Error loading brand auction counts:', error)
          setBrandAuctionCounts({})
        }
      } else {
        setBrandAuctionCounts({})
      }
    }

    loadBrandAuctionCounts()
  }, [brands])

  // Clear brand selection error when selection changes and becomes valid
  React.useEffect(() => {
    if (selectedAuctions.length > 0 && brandSelectionError) {
      const validation = validateBrandConsistency(selectedAuctions)
      if (validation.isValid) {
        setBrandSelectionError(null)
      }
    } else if (selectedAuctions.length === 0) {
      setBrandSelectionError(null)
    }
  }, [selectedAuctions, brandSelectionError, validateBrandConsistency])

  const handleView = (auctionId: number) => {
    if (onView) {
      onView(auctionId)
    } else {
      // Default navigation if no custom handler
      router.push(`/auctions/view/${auctionId}`)
    }
  }

  const handleEdit = (auctionId: number) => {
    if (onEdit) {
      onEdit(auctionId)
    } else {
      // Default navigation if no custom handler
      router.push(`/auctions/edit/${auctionId}`)
    }
  }

  const handleDelete = (auctionId: number) => {
    if (onDelete) {
      onDelete(auctionId)
    } else {
      // Default delete confirmation
      if (confirm('Are you sure you want to delete this auction?')) {
        // TODO: Implement default delete logic
        console.log('Delete auction:', auctionId)
      }
    }
  }

  const handleImportEOA = (auctionId: number) => {
    if (onImportEOA) {
      onImportEOA(auctionId)
    } else {
      console.log('Import EOA for auction:', auctionId)
    }
  }

  const handleGenerateInvoice = (auctionId: number) => {
    if (onGenerateInvoice) {
      onGenerateInvoice(auctionId)
    } else {
      // Default navigation to invoice view
      router.push(`/auctions/${auctionId}/invoices`)
    }
  }

  const handleGeneratePassedAuction = (auctionIds: number[]) => {
    const selectedAuctionList = auctions.filter(a => auctionIds.includes(a.id))
    
    if (selectedAuctionList.length === 0) {
      setGenerateError('No auctions selected')
      return
    }

    // Validate all auctions are from the same brand
    const brandIds = [...new Set(selectedAuctionList.map(a => a.brand?.id).filter(Boolean))]
    if (brandIds.length > 1) {
      setGenerateError('All selected auctions must be from the same brand')
      return
    }

    setSelectedAuctionsForPassed(selectedAuctionList)
    setGenerateError(null)
    setBrandSelectionError(null) // Clear any previous brand selection errors

    // Auto-fill short name based on brand
    const brandId = brandIds[0]
    let suggestedShortName = ''
    if (brandId && brands.length > 0) {
      const selectedBrand = brands.find(b => b.id === brandId)
      if (selectedBrand) {
        const auctionCount = brandAuctionCounts[selectedBrand.id] || 0
        const nextAuctionNumber = auctionCount + 1
        suggestedShortName = `${selectedBrand.code} ${nextAuctionNumber}`
      }
    }
    
    // If multiple auctions, use brand code + number format
    if (!suggestedShortName && brandId && brands.length > 0) {
      const selectedBrand = brands.find(b => b.id === brandId)
      if (selectedBrand) {
        const auctionCount = brandAuctionCounts[selectedBrand.id] || 0
        const nextAuctionNumber = auctionCount + 1
        suggestedShortName = `${selectedBrand.code} ${nextAuctionNumber}`
      }
    }
    
    // Fallback to first auction's short name + " - Passed"
    if (!suggestedShortName && selectedAuctionList.length > 0) {
      suggestedShortName = `${selectedAuctionList[0].short_name} - Passed`
    }
    
    setPassedAuctionShortName(suggestedShortName)

    // Pre-fill long name - if multiple auctions, use generic name
    if (selectedAuctionList.length === 1) {
      setPassedAuctionLongName(`${selectedAuctionList[0].long_name} - Passed`)
    } else {
      const brandName = brandId ? brands.find(b => b.id === brandId)?.name : ''
      setPassedAuctionLongName(`${brandName ? brandName + ' ' : ''}Passed Items Auction`)
    }

    // Set default dates (next month first day and last day) - always set for both single and multiple
    const dates = getNextMonthDates()
    setPassedAuctionStartDate(dates.start)
    setPassedAuctionSettlementDate(dates.end)

    setPassedAuctionDialogOpen(true)
  }

  const handlePassedAuctionSubtypeSelect = async (subtype: string) => {
    if (selectedAuctionsForPassed.length === 0) return

    // Validate brand consistency (should already be validated, but double-check)
    const brandIds = [...new Set(selectedAuctionsForPassed.map(a => a.brand?.id).filter(Boolean))]
    if (brandIds.length > 1) {
      setGenerateError('All selected auctions must be from the same brand')
      return
    }

    // Validate dates (always required)
    if (!passedAuctionStartDate || !passedAuctionSettlementDate) {
      setGenerateError('Please provide both start date and settlement date')
      return
    }

    setGeneratingPassedAuction(true)
    setGenerateError(null)

    try {
      const auctionIds = selectedAuctionsForPassed.map(a => a.id)
      
      let newAuction
      if (auctionIds.length === 1) {
        // Single auction - use bulk endpoint to support dates
        newAuction = await generatePassedAuctionBulk(auctionIds, subtype as any, {
          short_name: passedAuctionShortName,
          long_name: passedAuctionLongName,
          catalogue_launch_date: passedAuctionStartDate,
          settlement_date: passedAuctionSettlementDate
        })
      } else {
        // Multiple auctions - use bulk endpoint
        newAuction = await generatePassedAuctionBulk(auctionIds, subtype as any, {
          short_name: passedAuctionShortName,
          long_name: passedAuctionLongName,
          catalogue_launch_date: passedAuctionStartDate,
          settlement_date: passedAuctionSettlementDate
        })
      }

      // Call the parent handler if provided
      if (onGeneratePassedAuction && auctionIds.length === 1) {
        onGeneratePassedAuction(auctionIds[0], subtype)
      }

      // Close the dialog and reset state
      setPassedAuctionDialogOpen(false)
      setSelectedAuctionsForPassed([])
      setPassedAuctionShortName('')
      setPassedAuctionLongName('')
      setPassedAuctionStartDate('')
      setPassedAuctionSettlementDate('')
      setGenerateError(null)

      // Show success message (you might want to add a toast notification here)
      console.log('Successfully created passed auction:', newAuction)

      // Refresh the page or reload auctions
      window.location.reload()

    } catch (error) {
      console.error('Error generating passed auction:', error)
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate passed auction')
    } finally {
      setGeneratingPassedAuction(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (onSort) {
      const newDirection = currentSortField === field && currentSortDirection === 'asc' ? 'desc' : 'asc'
      onSort(field, newDirection)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allAuctionIds = auctions.map(auction => auction.id)
      const validation = validateBrandConsistency(allAuctionIds)

      if (validation.isValid) {
        onSelectionChange(allAuctionIds)
        setBrandSelectionError(null)
        loadUnsoldCounts(allAuctionIds)
      } else {
        setBrandSelectionError(validation.error!)
        // Don't change selection if validation fails
      }
    } else {
      onSelectionChange([])
      setBrandSelectionError(null)
      loadUnsoldCounts([])
    }
  }

  const handleSelectAuction = (auctionId: number, checked: boolean) => {
    if (checked) {
      const newSelectedAuctions = [...selectedAuctions, auctionId]
      const validation = validateBrandConsistency(newSelectedAuctions)

      if (validation.isValid) {
        onSelectionChange(newSelectedAuctions)
        setBrandSelectionError(null)
        loadUnsoldCounts(newSelectedAuctions)
      } else {
        setBrandSelectionError(validation.error!)
        // Don't change selection if validation fails
      }
    } else {
      const remainingSelected = selectedAuctions.filter(id => id !== auctionId)
      onSelectionChange(remainingSelected)
      // Clear error when deselecting (might resolve the issue)
      if (remainingSelected.length > 0) {
        const validation = validateBrandConsistency(remainingSelected)
        if (validation.isValid) {
          setBrandSelectionError(null)
        }
        loadUnsoldCounts(remainingSelected)
      } else {
        setBrandSelectionError(null)
        loadUnsoldCounts([])
      }
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (currentSortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return currentSortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  // Use auctions as-is since sorting is handled by backend
  const sortedAuctions = auctions

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedAuctions.length === auctions.length && auctions.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>#</span>
                  <SortIcon field="id" />
                </button>
              </th>



              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('long_name')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Name</span>
                  <SortIcon field="long_name" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Type</span>
                  <SortIcon field="type" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lots
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Launch Date
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('endingDate')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Ending Date</span>
                  <SortIcon field="endingDate" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAuctions.map((auction) => (
              <tr key={auction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedAuctions.includes(auction.id)}
                    onChange={(e) => handleSelectAuction(auction.id, e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleView(auction.id)}
                    className="text-teal-600 hover:text-teal-700 font-medium hover:underline transition-colors cursor-pointer"
                  >
                    {auction.number}
                  </button>
                </td>



                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleView(auction.id)}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors cursor-pointer text-left"
                  >
                    <div className="flex flex-col">
                      <span>{auction.long_name}</span>
                      <span className="text-xs text-gray-500">{auction.short_name}</span>
                      <div className="flex items-center mt-1 space-x-2 text-xs text-gray-400">
                        {auction.brand?.name && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {auction.brand.name}
                          </span>
                        )}
                        {auction.platform && (
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                            {auction.platform}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <div
                          className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getAuctionStatus(auction).color)}
                        >
                          {getAuctionStatus(auction).status}
                        </div>
                        {auction.upload_status === 'uploaded' && (
                          <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            Uploaded
                          </div>
                        )}
                        {selectedAuctions.includes(auction.id) && (
                          <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            {loadingUnsoldCounts ? (
                              <span className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-amber-600 mr-1"></div>
                                Loading...
                              </span>
                            ) : (
                              `Unsold: ${unsoldCounts[auction.id] || 0}`
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.type}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700 hover:underline transition-colors">
                    {auction.lots}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date).toLocaleDateString() : '-'}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.endingDate}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === auction.id ? null : auction.id)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="More actions"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {actionMenuOpen === auction.id && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleView(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-3" />
                            View Auction
                          </button>
                          {getAuctionStatus(auction).status !== 'Past' && (
                            <button
                              onClick={() => {
                                handleEdit(auction.id)
                                setActionMenuOpen(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-3" />
                              Edit Auction
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleImportEOA(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 cursor-pointer"
                          >
                            <Upload className="h-4 w-4 mr-3" />
                            Import EOA Data
                          </button>
                          <button
                            onClick={() => {
                              handleGenerateInvoice(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-3" />
                            View Auction Invoices
                          </button>
                          <button
                            onClick={() => {
                              handleGeneratePassedAuction([auction.id])
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer"
                          >
                            <Plus className="h-4 w-4 mr-3" />
                            Generate Passed Auction
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Delete Auction
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {auctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No auctions found</p>
          </div>
        )}
      </div>

      {/* Brand Selection Error */}
      {brandSelectionError && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 mb-1">Brand Selection Restriction</h4>
              <p className="text-sm text-amber-700">{brandSelectionError}</p>
              <p className="text-xs text-amber-600 mt-2">
                To generate a passed auction, please select auctions from the same brand only.
              </p>
            </div>
            <button
              onClick={() => setBrandSelectionError(null)}
              className="text-amber-600 hover:text-amber-800 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Passed Auction Dialog */}
      {passedAuctionDialogOpen && selectedAuctionsForPassed.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Generate Passed Auction
                {selectedAuctionsForPassed.length > 1 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({selectedAuctionsForPassed.length} auctions)
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setPassedAuctionDialogOpen(false)
                  setSelectedAuctionsForPassed([])
                  setPassedAuctionShortName('')
                  setPassedAuctionLongName('')
                  setPassedAuctionStartDate('')
                  setPassedAuctionSettlementDate('')
                  setGenerateError(null)
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {selectedAuctionsForPassed.length === 1
                    ? `Create a new auction with unsold items from "${selectedAuctionsForPassed[0].long_name}".`
                    : `Create a new auction with unsold items from ${selectedAuctionsForPassed.length} selected auctions.`}
                </p>
                {selectedAuctionsForPassed.length > 1 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800 font-medium mb-1">Selected Auctions:</p>
                    <ul className="text-xs text-blue-700 list-disc list-inside">
                      {selectedAuctionsForPassed.map((auction) => (
                        <li key={auction.id}>
                          {auction.short_name} - {auction.long_name}
                          <span className="ml-2 text-amber-600 font-medium">
                            ({unsoldCounts[auction.id] || 0} unsold items)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Total Unsold Items Summary */}
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-amber-800">Total Unsold Items: </span>
                      {loadingUnsoldCounts ? (
                        <span className="flex items-center text-amber-700">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-amber-600 mr-1"></div>
                          Loading...
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">{totalUnsoldCount}</span>
                      )}
                    </div>
                    {totalUnsoldCount === 0 && !loadingUnsoldCounts && (
                      <span className="text-xs text-red-600">
                        No unsold items available
                      </span>
                    )}
                  </div>
                  {selectedAuctionsForPassed.length === 1 && (
                    <p className="text-xs text-amber-700 mt-1">
                      From "{selectedAuctionsForPassed[0].short_name}": {unsoldCounts[selectedAuctionsForPassed[0].id] || 0} unsold items
                    </p>
                  )}
                </div>
              </div>

              {generateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{generateError}</p>
                </div>
              )}

              {/* Auction Name Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Name *
                  </label>
                  <input
                    type="text"
                    value={passedAuctionShortName}
                    onChange={(e) => setPassedAuctionShortName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AURUM 5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-filled based on brand auction count
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Long Name *
                  </label>
                  <input
                    type="text"
                    value={passedAuctionLongName}
                    onChange={(e) => setPassedAuctionLongName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Winter Contemporary Art Sale 2024 - Passed"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedAuctionsForPassed.length === 1 
                      ? 'Pre-filled with " - Passed" suffix'
                      : 'Name for the combined passed auction'}
                  </p>
                </div>
              </div>

              {/* Date Fields - Always show */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catalogue Launch Date (Start Date) *
                  </label>
                  <input
                    type="datetime-local"
                    value={passedAuctionStartDate}
                    onChange={(e) => setPassedAuctionStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default: Next month's first day
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Settlement Date (End Date) *
                  </label>
                  <input
                    type="datetime-local"
                    value={passedAuctionSettlementDate}
                    onChange={(e) => setPassedAuctionSettlementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default: Next month's last day
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-4">Select Auction Subtype:</p>

              <div className="space-y-3">
                {AUCTION_SUBTYPES.map((subtype) => (
                  <button
                    key={subtype.value}
                    onClick={() => handlePassedAuctionSubtypeSelect(subtype.value)}
                    disabled={generatingPassedAuction}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <div className="font-medium text-sm text-gray-900">{subtype.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{subtype.description}</div>
                  </button>
                ))}
              </div>

              {generatingPassedAuction && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Creating passed auction...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

AuctionsTable.displayName = 'AuctionsTable'

export default AuctionsTable 