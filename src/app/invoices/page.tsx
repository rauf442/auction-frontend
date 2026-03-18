// frontend/src/app/invoices/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FileText, Import, Download, Users, Filter, RefreshCw } from 'lucide-react'
import { getAuctions, getAuctionInvoices, exportEOACsv, type Auction, type Invoice } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useBrand } from '@/lib/brand-context'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'
import InvoiceTable from '@/components/invoices/InvoiceTable'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { useRouter } from 'next/navigation'
import { ListPageHeader } from '@/components/layout/ListPageHeader'

interface InvoicesPageState {
  auctions: Auction[]
  selectedAuctionId: number | null
  selectedAuction: Auction | null
  invoices: Invoice[]
  loading: boolean
  auctionsLoading: boolean
  page: number
  totalPages: number
  showEOADialog: boolean
}

export default function InvoicesPage() {
  const { brand } = useBrand()
  const router = useRouter()
  const [state, setState] = useState<InvoicesPageState>({
    auctions: [],
    selectedAuctionId: null,
    selectedAuction: null,
    invoices: [],
    loading: false,
    auctionsLoading: true,
    page: 1,
    totalPages: 1,
    showEOADialog: false
  })

  // Brand selection state
  const [selectedBrandId, setSelectedBrandId] = useState<number | 'all'>('all')
  const [brands, setBrands] = useState<Brand[]>([])

  // Separate state for buyer and vendor invoices
  const [buyerInvoices, setBuyerInvoices] = useState<Invoice[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<Invoice[]>([])
  const [buyerLoading, setBuyerLoading] = useState(false)
  const [vendorLoading, setVendorLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'buyer' | 'vendor'>('buyer')
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL? `${process.env.NEXT_PUBLIC_API_URL}/api`: 'http://localhost:3001/api';
  const [generating, setGenerating] = useState(false);

  // Load brands on component mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await getBrands()
        if (response.success && response.data) {
          setBrands(response.data)
          console.log('Loaded brands:', response.data.length)
        } else {
          console.error('Failed to load brands:', response)
        }
      } catch (err: any) {
        console.error('Error loading brands:', err)
      }
    }
    loadBrands()
  }, [])

  // Load auctions when brands are loaded or brand selection changes
  useEffect(() => {
    if (brands.length > 0) {
      loadAuctions()
    }
  }, [brands.length, selectedBrandId])

  // Load invoices when auction is selected
  useEffect(() => {
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, 1)
      loadVendorInvoices(state.selectedAuctionId, 1)
    } else {
      setBuyerInvoices([])
      setVendorInvoices([])
    }
  }, [state.selectedAuctionId, brand])


  const loadAuctions = async () => {
    try {
      setState(prev => ({ ...prev, auctionsLoading: true }))

      // Prepare auction query parameters
      const auctionParams: any = {
        page: 1,
        limit: 100
      }

      // Only add brand_id filter if a specific brand is selected (not 'all')
      if (selectedBrandId !== 'all') {
        auctionParams.brand_id = selectedBrandId
      }

      const response = await getAuctions(auctionParams)
      setState(prev => ({
        ...prev,
        auctions: response.auctions || [],
        auctionsLoading: false
      }))
    } catch (error) {
      console.error('Failed to load auctions:', error)
      setState(prev => ({ ...prev, auctionsLoading: false }))
    }
  }

  const loadBuyerInvoices = async (auctionId: number, page: number = 1) => {
    try {
      setBuyerLoading(true)

      const invoiceParams: any = {
        page,
        limit: 50,
        type: 'buyer'
      }

      // Only add brand_id filter if a specific brand is selected (not 'all')
      if (selectedBrandId !== 'all') {
        invoiceParams.brand_id = selectedBrandId
      }

      const response = await getAuctionInvoices(auctionId.toString(), invoiceParams)

      setBuyerInvoices(response.data.invoices || [])
      setBuyerLoading(false)
    } catch (error) {
      console.error('Failed to load buyer invoices:', error)
      setBuyerInvoices([])
      setBuyerLoading(false)
    }
  }

  const loadVendorInvoices = async (auctionId: number, page: number = 1) => {
    try {
      setVendorLoading(true)

      const invoiceParams: any = {
        page,
        limit: 50,
        type: 'vendor'
      }

      // Only add brand_id filter if a specific brand is selected (not 'all')
      if (selectedBrandId !== 'all') {
        invoiceParams.brand_id = selectedBrandId
      }

      const response = await getAuctionInvoices(auctionId.toString(), invoiceParams)

      setVendorInvoices(response.data.invoices || [])
      setVendorLoading(false)
    } catch (error) {
      console.error('Failed to load vendor invoices:', error)
      setVendorInvoices([])
      setVendorLoading(false)
    }
  }

  const handleAuctionSelect = (auctionId: string | null) => {
    const selectedId = auctionId ? parseInt(auctionId) : null
    const auction = selectedId ? state.auctions.find(a => a.id === selectedId) : null

    setState(prev => ({
      ...prev,
      selectedAuctionId: selectedId,
      selectedAuction: auction || null
    }))
  }

  const handleBrandSelect = (brandId: string | null) => {
    const selectedId = brandId === 'all' ? 'all' : (brandId ? parseInt(brandId) : 'all')
    setSelectedBrandId(selectedId)

    // Clear selected auction when brand changes
    setState(prev => ({
      ...prev,
      selectedAuctionId: null,
      selectedAuction: null
    }))

    // Clear invoices when brand changes
    setBuyerInvoices([])
    setVendorInvoices([])
  }



  const handleImportEOA = () => {
    if (!state.selectedAuctionId) {
      toast.warning('Please select an auction first')
      return
    }
    setState(prev => ({ ...prev, showEOADialog: true }))
  }

  const handleExportEOA = async () => {
    if (!state.selectedAuctionId) {
      toast.warning('Please select an auction first')
      return
    }

    try {
      const csvBlob = await exportEOACsv(state.selectedAuctionId.toString())

      // Create download link
      const url = window.URL.createObjectURL(csvBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `eoa-export-${state.selectedAuctionId}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export EOA CSV:', error)
      toast.error('Failed to export CSV. Please try again.')
    }
  }

  const handleEOAImportSuccess = () => {
    setState(prev => ({ ...prev, showEOADialog: false }))
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, 1)
      loadVendorInvoices(state.selectedAuctionId, 1)
    }
  }

  const handleRefreshBuyer = () => {
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, 1)
    }
  }

  const handleRefreshVendor = () => {
    if (state.selectedAuctionId) {
      loadVendorInvoices(state.selectedAuctionId, 1)
    }
  }

  const handleGenerateInvoices = async () => {
    if (!state.selectedAuctionId) {
      alert('Please select an auction first')
      return
    }
    if (selectedBrandId === 'all') {
      alert('Please select a brand')
      return
    }

    try {
      setGenerating(true)

      const brand = brands.find(b => b.id === selectedBrandId)?.name
      const auctionId = state.selectedAuctionId
      const brandId = selectedBrandId
      if(!auctionId){
        alert ("No auction Selected.")
        return;
      }
      const queryParams = new URLSearchParams({
        brand: brand || '',
        auctionId: auctionId.toString(),
        brandId: brandId.toString()
      })

      const response = await fetch(
        `${API_BASE_URL}/invoices/generateautomaticinvoices/${auctionId}?${queryParams.toString()}`,
        { method: 'GET' }
      )

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.count} invoices generated successfully`)
        // Refresh invoices after generation
        loadBuyerInvoices(auctionId, 1)
        loadVendorInvoices(auctionId, 1)
      } else {
        alert(`❌ Failed to generate invoices: ${data.message}`)
      }
    } catch (error) {
      console.error('Error generating invoices:', error)
      alert('❌ Error generating invoices. Check console for details.')
    } finally {
      setGenerating(false)
    }

  }

  // Convert auctions to SearchableSelect format with enhanced information
  const auctionOptions = state.auctions.map(auction => {
    const startDate = auction.catalogue_launch_date
      ? new Date(auction.catalogue_launch_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : 'Not set'

    const endDate = auction.settlement_date
      ? new Date(auction.settlement_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : 'Not set'

    const status = (() => {
      const today = new Date()
      const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
      const settlementDate = new Date(auction.settlement_date)

      if (today > settlementDate) return 'Past'
      else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) return 'Present'
      else return 'Future'
    })()

    return {
      value: auction.id.toString(),
      label: `${auction.short_name} - ${auction.long_name}`,
      description: `${status} • ${startDate} - ${endDate} • ${auction.artwork_ids?.length || 0} items`,
      searchableText: `${auction.short_name} ${auction.long_name} ${auction.description || ''} ${status} ${startDate} ${endDate}`.toLowerCase()
    }
  })

  // Convert brands to SearchableSelect format with enhanced information
  const brandOptions = [
    {
      value: 'all',
      label: 'All Brands',
      description: 'View all auctions across all brands'
    },
    ...brands.map(brand => ({
      value: brand.id.toString(),
      label: `${brand.name} (${brand.code})`,
      description: brand.contact_email || 'No contact email set'
    }))
  ]

  const hasAuctionSelected = Boolean(state.selectedAuctionId)

  const headerActions = [
    {
      label: 'Assign vendors',
      icon: Users,
      onClick: () =>
        hasAuctionSelected &&
        router.push(`/invoices/assign-vendor?auction_id=${state.selectedAuctionId}`),
      variant: 'primary' as const,
      disabled: !hasAuctionSelected
    },
    {
      label: 'Import EOA',
      icon: Import,
      onClick: handleImportEOA,
      variant: 'secondary' as const,
      disabled: !hasAuctionSelected
    },
    {
      label: 'Export CSV',
      icon: Download,
      onClick: handleExportEOA,
      variant: 'ghost' as const,
      disabled: !hasAuctionSelected
    }
  ]


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <ListPageHeader
          eyebrow="Invoices"
          title="Invoice management"
          description="Manage settlement-ready buyer and vendor invoices."
          stats={[
            { label: 'Auctions', value: state.auctions.length || 0 },
            { label: 'Buyer invoices', value: buyerInvoices.length, tone: 'info' },
            { label: 'Vendor invoices', value: vendorInvoices.length, tone: 'success' }
          ]}
          actions={headerActions}
        />

        <section className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <Filter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Filters</h2>
          </div>
          
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Brand</label>
                <SearchableSelect
                  options={brandOptions}
                  value={selectedBrandId === 'all' ? 'all' : selectedBrandId?.toString() || 'all'}
                  onChange={handleBrandSelect}
                  placeholder="Select a brand..."
                  isLoading={brands.length === 0}
                  inputPlaceholder="Search brands..."
                />
              </div>
            
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Auction</label>
                <SearchableSelect
                  options={auctionOptions}
                  value={state.selectedAuctionId?.toString() || null}
                  onChange={handleAuctionSelect}
                  placeholder="Select an auction..."
                  isLoading={state.auctionsLoading}
                  inputPlaceholder="Search auctions..."
                />
              </div>
              <button
                onClick={handleGenerateInvoices}
                className={`inline-flex items-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold transition
                  ${generating 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Import className="mr-2 h-4 w-4" />
                Sync Invoices with Live Auctioneer
              </button>

            </div>

            {selectedBrandId !== 'all' && selectedBrandId && brands.find(b => b.id === selectedBrandId)?.code && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <XeroConnectButton
                  brandId={selectedBrandId.toString()}
                  brandName={brands.find(b => b.id === selectedBrandId)?.name || ''}
                  selectedBrand={brands.find(b => b.id === selectedBrandId)?.code || ''}
                  variant="compact"
                />
              </div>
            )}

            {state.selectedAuction && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{state.selectedAuction.long_name}</h3>
                    <p className="text-sm text-slate-500">{state.selectedAuction.short_name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        router.push(`/invoices/assign-vendor?auction_id=${state.selectedAuctionId}`)
                      }
                      className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Assign vendors
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/invoices/private-sale?auction_id=${state.selectedAuctionId}`)
                      }
                      className="inline-flex items-center rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Private sale
                    </button>
                    <button
                      onClick={handleImportEOA}
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Import className="mr-2 h-4 w-4" />
                      Import EOA
                    </button>
                    <button
                      onClick={handleExportEOA}
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Type</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {state.selectedAuction.type?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Start date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {state.selectedAuction.catalogue_launch_date
                        ? new Date(state.selectedAuction.catalogue_launch_date).toLocaleDateString('en-GB')
                        : 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">End date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {new Date(state.selectedAuction.settlement_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Items</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {state.selectedAuction.artwork_ids?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {state.selectedAuctionId ? (
          <section className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="border-b border-slate-100">
              <div className="flex flex-wrap">
                <button
                  onClick={() => setActiveTab('buyer')}
                  className={`px-6 py-3 text-sm font-semibold transition ${
                    activeTab === 'buyer'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Buyer invoices ({buyerInvoices.length})
                </button>
                <button
                  onClick={() => setActiveTab('vendor')}
                  className={`px-6 py-3 text-sm font-semibold transition ${
                    activeTab === 'vendor'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Vendor invoices ({vendorInvoices.length})
                </button>
                <div className="flex-1" />
                <button
                  onClick={activeTab === 'buyer' ? handleRefreshBuyer : handleRefreshVendor}
                  className="px-4 py-3 text-slate-500 transition hover:text-slate-900"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      (activeTab === 'buyer' ? buyerLoading : vendorLoading) ? 'animate-spin' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              {activeTab === 'buyer' && (
                <InvoiceTable
                  invoices={buyerInvoices}
                  loading={buyerLoading}
                  onRefresh={handleRefreshBuyer}
                  invoiceType="buyer"
                />
              )}
              {activeTab === 'vendor' && (
                <InvoiceTable
                  invoices={vendorInvoices}
                  loading={vendorLoading}
                  onRefresh={handleRefreshVendor}
                  invoiceType="vendor"
                />
              )}
            </div>
          </section>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-12 text-center text-slate-500 shadow-sm">
            <FileText className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            Select an auction to view invoices
          </div>
        )}
      </div>

      {state.showEOADialog && state.selectedAuctionId && (
        <EOAImportDialog
          auctionId={state.selectedAuctionId}
          onClose={() => setState(prev => ({ ...prev, showEOADialog: false }))}
          onImportComplete={(count) => {
            console.log(`Imported ${count} invoices`)
            handleEOAImportSuccess()
          }}
        />
      )}
    </div>
  )
}