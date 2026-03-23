// frontend/src/components/invoices/InvoiceTable.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { MoreVertical, Edit, FileText, Package, Download, Mail, Trash2, AlertTriangle, CreditCard } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { generateInvoicePdf } from '@/lib/auctions-api'
import { InvoicesAPI } from '@/lib/invoices-api'
import { fetchClient, type Client } from '@/lib/clients-api'
import LogisticsEditDialog from './LogisticsEditDialog'
import EmailPreviewDialog from './EmailPreviewDialog'

interface Invoice {
  id: number
  invoice_number: string
  sale_prices?: number[]
  buyer_premium_prices?: number[]
  buyer_first_name: string
  buyer_last_name: string
  buyer_email: string
  buyer_phone: string
  platform: string
  status: string
  paid_amount?: number
  type?: 'buyer' | 'vendor'
  created_at: string
  client_id?: number | null
  client?: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    company_name?: string
  }
  brand?: {
    code: string
    name: string
  }
  logistics?: any
  total_amount?: number
  item_ids?: number[]
  lot_ids?: string[]
  email_winning_bid_sent_at?: string | null
  email_payment_confirmation_sent_at?: string | null
  email_shipping_confirmation_sent_at?: string | null
  email_vendor_sale_notification_sent_at?: string | null
  email_vendor_payment_confirmation_sent_at?: string | null
}

interface InvoiceTableProps {
  invoices: Invoice[]
  loading?: boolean
  onRefresh?: () => void
  invoiceType?: 'buyer' | 'vendor'
}

export default function InvoiceTable({ invoices, loading = false, onRefresh, invoiceType = 'buyer' }: InvoiceTableProps) {
  const { brand } = useBrand()
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)
  const [showLogisticsDialog, setShowLogisticsDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', invoice?: Invoice }>({ type: 'single' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPaidAmountDialog, setShowPaidAmountDialog] = useState(false)
  const [paidAmountInput, setPaidAmountInput] = useState('')
  const [isUpdatingPaidAmount, setIsUpdatingPaidAmount] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailType, setEmailType] = useState<'winning_bid' | 'payment_confirmation' | 'shipping_confirmation' | 'vendor_sale_notification' | 'vendor_payment_confirmation'>('winning_bid')

  // Client data cache
  const [clientData, setClientData] = useState<Map<number, Client>>(new Map())
  const [loadingClients, setLoadingClients] = useState<Set<number>>(new Set())

  // Load client data for invoices that have client_id but no client data
  const loadClientData = async (clientId: number) => {
    if (clientData.has(clientId) || loadingClients.has(clientId)) {
      return
    }

    setLoadingClients(prev => new Set(prev).add(clientId))

    try {
      const response = await fetchClient(clientId)
      if (response.success && response.data) {
        setClientData(prev => new Map(prev).set(clientId, response.data))
      }
    } catch (error) {
      console.error(`Failed to load client data for ID ${clientId}:`, error)
    } finally {
      setLoadingClients(prev => {
        const newSet = new Set(prev)
        newSet.delete(clientId)
        return newSet
      })
    }
  }

  // Load client data for all invoices with client_id
  useEffect(() => {
    const clientIdsToLoad = invoices
      .filter(invoice => invoice.client_id && !clientData.has(invoice.client_id) && !loadingClients.has(invoice.client_id))
      .map(invoice => invoice.client_id!)
      .filter(Boolean)

    clientIdsToLoad.forEach(clientId => {
      loadClientData(clientId)
    })
  }, [invoices, clientData, loadingClients])

const handleGeneratePdf = async (invoiceId: number, type: 'internal' | 'final') => {
  try {
    const brandCode = typeof brand === 'string' ? brand : (brand as any)?.code
    const blob = await generateInvoicePdf(invoiceId, type, brandCode)
    const url = URL.createObjectURL(blob)
    // Open in new tab for viewing
    const newTab = window.open('', '_blank')
    if (newTab) {
      newTab.document.write(`
        <html>
          <head><title>Invoice ${invoiceId}</title></head>
          <body style="margin:0">
            <embed src="${url}" type="application/pdf" width="100%" height="100%" />
          </body>
        </html>
      `)
      newTab.document.close()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    toast.error('Failed to generate PDF')
  }
}

  const handleGeneratePublicUrl = async (invoice: Invoice) => {
    try {
      // Get client ID from invoice
      const clientId = invoice.client_id || invoice.client?.id
      
      if (!clientId) {
        toast.warning('Client ID is required to generate public URL')
        return
      }

      // Get brand code from brand context or invoice
      const brandCode = typeof brand === 'string' ? brand : (brand as any)?.code
      const invoiceBrandCode = invoice.brand?.code || brandCode
      
      // Generate brand-specific URL
      let brandUrl = ''
      if (invoiceBrandCode?.toUpperCase() === 'AURUM') {
        brandUrl = process.env.NEXT_PUBLIC_FRONTEND_URL_AURUM || 'http://localhost:3003'
      } else if (invoiceBrandCode?.toUpperCase() === 'METSAB') {
        brandUrl = process.env.NEXT_PUBLIC_FRONTEND_URL_METSAB || 'http://localhost:3002'
      } else {
        brandUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
      }
      
      const publicUrl = `${brandUrl}/invoice/${invoice.id}/${clientId}`
      
      // Open the URL in a new tab (primary action)
      window.open(publicUrl, '_blank')

      // Also copy URL to clipboard for reference
      try {
        await navigator.clipboard.writeText(publicUrl)
        console.log('Public invoice URL copied to clipboard:', publicUrl)
      } catch (clipboardError) {
        console.warn('Failed to copy URL to clipboard:', clipboardError)
      }
    } catch (error) {
      console.error('Failed to generate public URL:', error)
      toast.error('Failed to generate public URL')
    }
  }

  const handleEditLogistics = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowLogisticsDialog(true)
    setActionMenuOpen(null)
  }

  const handleLogisticsSuccess = () => {
    setShowLogisticsDialog(false)
    setSelectedInvoice(null)
    onRefresh?.()
  }


  const handleDeleteSingle = (invoice: Invoice) => {
    setDeleteTarget({ type: 'single', invoice })
    setShowDeleteDialog(true)
    setActionMenuOpen(null)
  }

  const handleDeleteBulk = () => {
    if (selectedInvoices.size === 0) {
      toast.warning('Please select invoices to delete')
      return
    }
    setDeleteTarget({ type: 'bulk' })
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      if (deleteTarget.type === 'single' && deleteTarget.invoice) {
        await InvoicesAPI.deleteInvoice(deleteTarget.invoice.id)
        toast.success(`Invoice "${deleteTarget.invoice.invoice_number}" has been deleted successfully!`)
      } else if (deleteTarget.type === 'bulk') {
        const deletePromises = Array.from(selectedInvoices).map(invoiceId =>
          InvoicesAPI.deleteInvoice(invoiceId)
        )
        await Promise.all(deletePromises)
        toast.success(`${selectedInvoices.size} invoice(s) have been deleted successfully!`)
        setSelectedInvoices(new Set()) // Clear selection after bulk delete
      }

      setShowDeleteDialog(false)
      setDeleteTarget({ type: 'single' })
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete invoice(s):', error)
      toast.error('Failed to delete invoice(s). Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(invoices.map(invoice => invoice.id)))
    } else {
      setSelectedInvoices(new Set())
    }
  }

  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleSetPaidAmount = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaidAmountInput(invoice.paid_amount?.toString() || '0')
    setShowPaidAmountDialog(true)
    setActionMenuOpen(null)
  }

  const handleUpdatePaidAmount = async () => {
    if (!selectedInvoice) return

    setIsUpdatingPaidAmount(true)
    try {
      const paidAmount = parseFloat(paidAmountInput) || 0

      await InvoicesAPI.updatePaidAmount(selectedInvoice.id, paidAmount)

      setShowPaidAmountDialog(false)
      setSelectedInvoice(null)
      setPaidAmountInput('')
      onRefresh?.()
      toast.success('Paid amount updated successfully!')
    } catch (error) {
      console.error('Failed to update paid amount:', error)
      toast.error('Failed to update paid amount. Please try again.')
    } finally {
      setIsUpdatingPaidAmount(false)
    }
  }

  const handleSendVendorEmail = (invoice: Invoice, type: 'sale_notification' | 'payment_confirmation') => {
    // Validate vendor email exists before opening preview
    let vendorEmail = invoice.buyer_email

    // If buyer_email is empty for vendor invoices, try to get it from the client data cache
    if (invoice.type === 'vendor' && (!vendorEmail || vendorEmail.trim() === '')) {
      const clientInfo = invoice.client_id ? clientData.get(invoice.client_id) as Client : null
      vendorEmail = clientInfo?.email || invoice.client?.email || ''
    }

    if (!vendorEmail || vendorEmail.trim() === '') {
      toast.warning(`Vendor email address is required. Please ensure the vendor client (ID: ${invoice.client_id}) has an email address set.`)
      return
    }

    // Set email type and open preview dialog
    const emailTypeToSet = type === 'sale_notification' ? 'vendor_sale_notification' : 'vendor_payment_confirmation'

    setSelectedInvoice(invoice)
    setEmailType(emailTypeToSet)
    setShowEmailPreview(true)
    setActionMenuOpen(null)
  }

  const handleSendBuyerEmail = (invoice: Invoice, type: 'winning_bid' | 'payment_confirmation' | 'shipping_confirmation') => {
    setSelectedInvoice(invoice)
    setEmailType(type)
    setShowEmailPreview(true)
    setActionMenuOpen(null)
  }

  const handleEmailSend = async () => {
    if (!selectedInvoice) return

    try {
      const token = localStorage.getItem('token')

      // Determine if this is a buyer or vendor email
      const isVendorEmail = emailType === 'vendor_sale_notification' || emailType === 'vendor_payment_confirmation'

      // Use appropriate endpoint and request format
      let response
      if (isVendorEmail) {
        // For vendor emails, map to the correct backend type
        const vendorType = emailType === 'vendor_sale_notification' ? 'sale_notification' : 'payment_confirmation'

        response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${selectedInvoice.id}/send-vendor-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: vendorType
            })
          }
        )
      } else {
        // For buyer emails
        response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${selectedInvoice.id}/send-buyer-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: emailType
            })
          }
        )
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send email')
      }

      toast.success(`${isVendorEmail ? 'Vendor' : 'Buyer'} email sent successfully to ${data.sentTo}`)
      setShowEmailPreview(false)
      setSelectedInvoice(null)
      setEmailType('winning_bid')
    } catch (error: any) {
      console.error('Failed to send email:', error)
      throw error // Re-throw to be handled by EmailPreviewDialog
    }
  }

  const isAllSelected = invoices.length > 0 && selectedInvoices.size === invoices.length
  const isPartiallySelected = selectedInvoices.size > 0 && selectedInvoices.size < invoices.length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getTotalAmount = (invoice: Invoice) => {
    // Use the calculated total_amount from the API response
    console.log('invoice', invoice)
    return invoice.total_amount || 0
  }

  const getHammerPrice = (invoice: Invoice) => {
    // Sum all sale prices from the array
    return (invoice.sale_prices || []).reduce((sum, price) => sum + price, 0)
  }

  const hasShippingInfo = (invoice: Invoice) => {
    // Check if invoice has shipping information
    // Shipping info is considered available if any of these fields exist and are not null/empty
    const logistics = invoice.logistics
    if (!logistics) return false

    return !!(
      (logistics.shipping_method && logistics.shipping_method.trim()) ||
      (logistics.shipping_status && logistics.shipping_status.trim()) ||
      (logistics.shipping_charge && logistics.shipping_charge > 0) ||
      (logistics.ship_to_first_name && logistics.ship_to_first_name.trim()) ||
      (logistics.ship_to_last_name && logistics.ship_to_last_name.trim()) ||
      (logistics.ship_to_address && logistics.ship_to_address.trim()) ||
      (logistics.ship_to_city && logistics.ship_to_city.trim())
    )
  }

  const getBuyerPremium = (invoice: Invoice) => {
    // Sum all buyer/vendor premium prices from the array
    return (invoice.buyer_premium_prices || []).reduce((sum, price) => sum + price, 0)
  }

  const isFullyPaid = (invoice: Invoice) => {
    const total = getTotalAmount(invoice)
    const paid = invoice.paid_amount || 0
    return paid >= total && total > 0
  }

  const isPartiallyPaid = (invoice: Invoice) => {
    const total = getTotalAmount(invoice)
    const paid = invoice.paid_amount || 0
    return paid > 0 && paid < total
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500">No invoices have been generated yet.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div className="bg-blue-600 border-b border-blue-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-white">
                {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeleteBulk}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedInvoices(new Set())}
                className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 text-black rounded-lg text-sm font-medium hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span
                        onClick={() => window.open(`/invoices/${invoice.id}?from=invoices`, '_blank')}
                        className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline transition-colors"
                      >
                        {invoice.invoice_number}
                      </span>
                      <div className="text-sm text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          // Use client data from cache if available, otherwise from nested client object
                          const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                            ? clientData.get(invoice.client_id)
                            : invoice.client

                          if (clientInfo?.id || (invoice.client_id && clientData.get(invoice.client_id))) {
                            const clientId = clientInfo?.id || invoice.client_id!
                            const isLoading = invoice.client_id && loadingClients.has(invoice.client_id)

                            return (
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  {isLoading ? (
                                    <span className="text-gray-400 italic flex items-center">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-2"></div>
                                      Loading...
                                    </span>
                                  ) : (
                                    <Link
                                      href={`/clients/${clientId}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center group"
                                      title={`View client details for ${clientInfo?.company_name || `${clientInfo?.first_name || 'Unknown'} ${clientInfo?.last_name || 'Client'}`}`}
                                    >
                                      {clientInfo?.company_name || `${clientInfo?.first_name || 'Unknown'} ${clientInfo?.last_name || 'Client'}`}
                                      <svg className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.25 17h-8.5A2.25 2.25 0 011.5 14.75v-8.5A2.25 2.25 0 013.75 4.25h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                                        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                                      </svg>
                                    </Link>
                                  )}
                                </div>
                                {invoice.type === 'vendor' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded w-fit mt-1">
                                    Vendor
                                  </span>
                                )}
                              </div>
                            )
                          } else {
                            // No client data available
                            return (
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <span className={invoice.type === 'vendor' ? "text-purple-600 font-medium" : "text-gray-400 italic"}>
                                    {invoice.client
                                      ? (invoice.client.company_name || `${invoice.client.first_name} ${invoice.client.last_name}`)
                                      : `${invoice.buyer_first_name || ''} ${invoice.buyer_last_name || ''}`.trim()
                                    }
                                  </span>
                                  {!invoice.client_id && (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                      No Client Record
                                    </span>
                                  )}
                                </div>
                                {invoice.type === 'vendor' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded w-fit mt-1">
                                    Vendor
                                  </span>
                                )}
                              </div>
                            )
                          }
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                            ? clientData.get(invoice.client_id)
                            : invoice.client
                          return clientInfo?.email || invoice.buyer_email || 'No email'
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                            ? clientData.get(invoice.client_id)
                            : invoice.client
                          return clientInfo?.phone_number || invoice.buyer_phone || 'No phone'
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Platform: {invoice.platform}
                      </div>
                      {(() => {
                        const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                          ? clientData.get(invoice.client_id)
                          : invoice.client
                        const hasClientData = clientInfo?.id || (invoice.client_id && clientData.get(invoice.client_id))
                        const hasBasicInfo = invoice.buyer_email || invoice.buyer_first_name

                        return !hasClientData && !hasBasicInfo && (
                          <div className="text-xs text-gray-400 mt-1">
                            Client info not available
                          </div>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Lot IDs: {(invoice as any).lot_ids?.join(', ') || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Item IDs: {invoice.item_ids?.join(', ') || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(getTotalAmount(invoice))}
                      </div>
                      <div className="text-sm text-gray-500">
                        Hammer Price: {formatCurrency(getHammerPrice(invoice))}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.type === 'vendor' ? 'Vendor' : 'Buyer'} Premium: {formatCurrency(getBuyerPremium(invoice))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {invoice.status === 'paid' ? 'Paid' :
                        invoice.status === 'cancelled' ? 'Cancelled' :
                          'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === invoice.id ? null : invoice.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {actionMenuOpen === invoice.id && (
                        <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-10 z-10 max-h-[600px] overflow-y-auto border border-gray-200">
                          <div className="py-2" role="menu">
                            {/* Buyer Invoice Workflow */}
                            {invoice.type !== 'vendor' && (
                              <>
                                {/* Stage 1: Initial Actions */}
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Stage 1: Hammer + Buyers Premium
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleEditLogistics(invoice)}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  <Package className="mr-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span>Edit Logistics Info</span>
                                </button>
                                <button
                                  onClick={() => handleGeneratePdf(invoice.id, 'internal')}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  <FileText className="mr-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span>Generate Invoice (Without Shipping)</span>
                                </button>
                                <button
                                  onClick={() => handleSendBuyerEmail(invoice, 'winning_bid')}
                                  className={`group flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 w-full text-left ${
                                    invoice.email_winning_bid_sent_at ? 'text-green-700' : 'text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <Mail className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                      invoice.email_winning_bid_sent_at ? 'text-green-500' : 'text-gray-400'
                                    }`} />
                                    <span>Send Winning Bid Email</span>
                                  </div>
                                  {invoice.email_winning_bid_sent_at && (
                                    <div className="flex items-center text-xs bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Sent
                                    </div>
                                  )}
                                </button>

                                {/* Stage 2: Payment Actions */}
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 mt-2">
                                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Stage 2: Shipping & Logistics
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleGeneratePdf(invoice.id, 'final')}
                                  disabled={!hasShippingInfo(invoice)}
                                  className={`group flex items-center px-4 py-2 text-sm w-full text-left ${
                                    !hasShippingInfo(invoice)
                                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                  title={!hasShippingInfo(invoice) ? 'Shipping information required' : undefined}
                                >
                                  <Download className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                    !hasShippingInfo(invoice) ? 'text-gray-300' : 'text-gray-400'
                                  }`} />
                                  <span>Generate Invoice (With Shipping)</span>
                                </button>
                                <button
                                  onClick={() => handleSendBuyerEmail(invoice, 'payment_confirmation')}
                                  disabled={!isPartiallyPaid(invoice) && !isFullyPaid(invoice)}
                                  className={`group flex items-center justify-between px-4 py-2 text-sm w-full text-left ${
                                    (!isPartiallyPaid(invoice) && !isFullyPaid(invoice))
                                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                                      : invoice.email_payment_confirmation_sent_at 
                                        ? 'text-green-700 hover:bg-gray-100'
                                        : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                  title={(!isPartiallyPaid(invoice) && !isFullyPaid(invoice)) ? 'Payment required' : undefined}
                                >
                                  <div className="flex items-center">
                                    <Mail className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                      invoice.email_payment_confirmation_sent_at ? 'text-green-500' : 'text-gray-400'
                                    }`} />
                                    <span>Send Payment Confirmation</span>
                                  </div>
                                  {invoice.email_payment_confirmation_sent_at && (
                                    <div className="flex items-center text-xs bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Sent
                                    </div>
                                  )}
                                </button>

                                {/* Stage 3: Shipping Confirmation */}
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 mt-2">
                                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Stage 3: Delivery & Collection Confirmation
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSendBuyerEmail(invoice, 'shipping_confirmation')}
                                  disabled={!isFullyPaid(invoice)}
                                  className={`group flex items-center justify-between px-4 py-2 text-sm w-full text-left ${
                                    !isFullyPaid(invoice)
                                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                                      : invoice.email_shipping_confirmation_sent_at 
                                        ? 'text-green-700 hover:bg-gray-100'
                                        : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                  title={!isFullyPaid(invoice) ? 'Full payment required' : undefined}
                                >
                                  <div className="flex items-center">
                                    <Mail className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                      invoice.email_shipping_confirmation_sent_at ? 'text-green-500' : 'text-gray-400'
                                    }`} />
                                    <span>Send Shipping Confirmation</span>
                                  </div>
                                  {invoice.email_shipping_confirmation_sent_at && (
                                    <div className="flex items-center text-xs bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Sent
                                    </div>
                                  )}
                                </button>
                              </>
                            )}

                            {/* Vendor Invoice Workflow */}
                            {invoice.type === 'vendor' && (
                              <>
                                {/* Stage 1: Invoice & Sale Notification */}
                                <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
                                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                                    Stage 1: Post Sale Invoice Confirmation
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleGeneratePdf(invoice.id, 'final')}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  <Download className="mr-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span>Generate Vendor Invoice</span>
                                </button>
                                <button
                                  onClick={() => handleSendVendorEmail(invoice, 'sale_notification')}
                                  className={`group flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 w-full text-left ${
                                    invoice.email_vendor_sale_notification_sent_at ? 'text-green-700' : 'text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <Mail className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                      invoice.email_vendor_sale_notification_sent_at ? 'text-green-500' : 'text-gray-400'
                                    }`} />
                                    <span>Sale Notification</span>
                                  </div>
                                  {invoice.email_vendor_sale_notification_sent_at && (
                                    <div className="flex items-center text-xs bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Sent
                                    </div>
                                  )}
                                </button>

                                {/* Stage 2: Payment Confirmation */}
                                <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 mt-2">
                                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                                    Stage 2: Post Sale Vendor Statement Confirmation
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSendVendorEmail(invoice, 'payment_confirmation')}
                                  disabled={!isFullyPaid(invoice)}
                                  className={`group flex items-center justify-between px-4 py-2 text-sm w-full text-left ${
                                    !isFullyPaid(invoice)
                                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                                      : invoice.email_vendor_payment_confirmation_sent_at 
                                        ? 'text-green-700 hover:bg-gray-100'
                                        : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                  title={!isFullyPaid(invoice) ? 'Full payment required' : undefined}
                                >
                                  <div className="flex items-center">
                                    <Mail className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                      invoice.email_vendor_payment_confirmation_sent_at ? 'text-green-500' : 'text-gray-400'
                                    }`} />
                                    <span>Payment Confirmation</span>
                                  </div>
                                  {invoice.email_vendor_payment_confirmation_sent_at && (
                                    <div className="flex items-center text-xs bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Sent
                                    </div>
                                  )}
                                </button>
                              </>
                            )}

                            {/* Other Actions */}
                            <div className="border-t border-gray-200 my-2"></div>
                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Other Actions
                            </div>
                            <button
                              onClick={() => handleGeneratePublicUrl(invoice)}
                              className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <FileText className="mr-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>Generate Invoice (with URL)</span>
                            </button>
                            <button
                              onClick={() => handleSetPaidAmount(invoice)}
                              className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <CreditCard className="mr-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>Set Paid Amount</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(invoice)}
                              className="group flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <Trash2 className="mr-3 h-4 w-4 text-red-500 flex-shrink-0" />
                              <span>Delete Invoice</span>
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
        </div>
      </div>

      {/* Logistics Edit Dialog */}
      {showLogisticsDialog && selectedInvoice && (
        <LogisticsEditDialog
          isOpen={showLogisticsDialog}
          onClose={() => {
            setShowLogisticsDialog(false)
            setSelectedInvoice(null)
          }}
          invoice={selectedInvoice}
          onSuccess={handleLogisticsSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Deletion
              </h3>
            </div>

            <div className="mb-6">
              {deleteTarget.type === 'single' && deleteTarget.invoice ? (
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete invoice{' '}
                  <span className="font-medium text-gray-900">
                    "{deleteTarget.invoice.invoice_number}"
                  </span>
                  ? This action cannot be undone.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-gray-900">
                    {selectedInvoices.size} invoice(s)
                  </span>
                  ? This action cannot be undone.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteTarget({ type: 'single' })
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Dialog */}
      {showEmailPreview && selectedInvoice && (
        <EmailPreviewDialog
          isOpen={showEmailPreview}
          onClose={() => {
            setShowEmailPreview(false)
            setSelectedInvoice(null)
          }}
          onSend={handleEmailSend}
          emailType={emailType}
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.invoice_number}
          recipientEmail={(() => {
            // For vendor invoices, get vendor email correctly
            if (selectedInvoice.type === 'vendor') {
              const clientInfo = selectedInvoice.client_id ? clientData.get(selectedInvoice.client_id) : null
              return (clientInfo as Client)?.email || selectedInvoice.client?.email || selectedInvoice.buyer_email || ''
            }
            // For buyer invoices, use client email or buyer email
            return selectedInvoice.client?.email || selectedInvoice.buyer_email || ''
          })()}
          recipientName={(() => {
            const clientInfo = selectedInvoice.client_id ? clientData.get(selectedInvoice.client_id) : selectedInvoice.client
            if (clientInfo) {
              return (clientInfo as Client).company_name || `${(clientInfo as Client).first_name} ${(clientInfo as Client).last_name}`.trim()
            }
            return `${selectedInvoice.buyer_first_name || ''} ${selectedInvoice.buyer_last_name || ''}`.trim()
          })()}
        />
      )}

      {/* Set Paid Amount Dialog */}
      {showPaidAmountDialog && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 text-blue-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Set Paid Amount
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Set the paid amount for invoice{' '}
                <span className="font-medium text-gray-900">
                  "{selectedInvoice.invoice_number}"
                </span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {selectedInvoice.sale_prices && selectedInvoice.sale_prices.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Hammer Price:</span>
                      <span>£{getHammerPrice(selectedInvoice).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium:</span>
                      <span>£{getBuyerPremium(selectedInvoice).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2 mt-2">
                      <span>Outstanding:</span>
                      <span>£{getTotalAmount(selectedInvoice).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaidAmountDialog(false)
                  setSelectedInvoice(null)
                  setPaidAmountInput('')
                }}
                disabled={isUpdatingPaidAmount}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePaidAmount}
                disabled={isUpdatingPaidAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isUpdatingPaidAmount ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Paid Amount
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
