// frontend/src/app/invoice/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Truck, CreditCard, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { InvoicesAPI } from '@/lib/invoices-api'
import PublicShippingDialog from '@/components/invoices/PublicShippingDialog'

interface Invoice {
  id: number
  invoice_number: string
  hammer_price?: number
  buyers_premium?: number
  total_amount?: number
  paid_amount?: number
  status?: string
  type?: string
  title?: string
  buyer_first_name?: string
  buyer_last_name?: string
  buyer_email?: string
  ship_to_address?: string
  ship_to_city?: string
  ship_to_country?: string
  ship_to_postal_code?: string
  total_shipping_amount?: number
  payment_link?: string
  logistics?: any
  items?: any[]
  client?: {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone_number?: string
  }
  brand?: {
    name: string
    code: string
  }
}

export default function PublicInvoicePage() {
  const params = useParams()
  const invoiceId = parseInt(params.id as string)
  const accessToken = params.token as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showShippingDialog, setShowShippingDialog] = useState(false)
  const [step, setStep] = useState<'payment' | 'shipping' | 'complete'>('payment')
  // Log the current domain for debugging
  useEffect(() => {
    const domain = typeof window !== 'undefined' ? window.location.origin : 'unknown'
    console.log('Public invoice page loaded from domain:', domain)
  }, [])

  useEffect(() => {
    if (accessToken) {
      loadInvoice()
    } else {
      setError('Access token is required')
      setLoading(false)
    }
  }, [invoiceId, accessToken])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      console.log('Loading public invoice for ID:', invoiceId, 'with token:', accessToken)

      if (!accessToken) {
        setError('Access token is required')
        return
      }

      const response = await InvoicesAPI.getPublicInvoice(invoiceId, accessToken)
      console.log('Public invoice API response:', response)

      if (response.success) {
        console.log('Invoice loaded successfully:', response.data)
        setInvoice(response.data)
        await determineStep(response.data)
        await generatePdf()
      } else {
        console.error('Failed to load invoice:', response.message)
        setError(response.message || 'Failed to load invoice')
      }
    } catch (err: any) {
      console.error('Error loading public invoice:', err)
      setError(err.message || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  const determineStep = async (invoiceData: Invoice) => {
    try {
      // Check payment status using the new payment status API with token verification
      const statusResult = await InvoicesAPI.checkPublicPaymentStatus(invoiceId, accessToken)

      if (statusResult.success) {
        if (statusResult.status === 'paid') {
          setStep('complete')
        } else if (statusResult.dueAmount <= (invoiceData.total_shipping_amount || 0)) {
          // Invoice paid but shipping not paid
          setStep('shipping')
        } else {
          setStep('payment')
        }
      } else {
        // Fallback to basic calculation if API fails
        const hammerAndPremium = (invoiceData.hammer_price || 0) + (invoiceData.buyers_premium || 0)
        const paidAmount = invoiceData.paid_amount || 0
        const totalAmount = invoiceData.total_amount || 0

        if (paidAmount >= totalAmount) {
          setStep('complete')
        } else if (paidAmount >= hammerAndPremium) {
          setStep('shipping')
        } else {
          setStep('payment')
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      // Fallback to basic calculation
      const hammerAndPremium = (invoiceData.hammer_price || 0) + (invoiceData.buyers_premium || 0)
      const paidAmount = invoiceData.paid_amount || 0
      const totalAmount = invoiceData.total_amount || 0

      if (paidAmount >= totalAmount) {
        setStep('complete')
      } else if (paidAmount >= hammerAndPremium) {
        setStep('shipping')
      } else {
        setStep('payment')
      }
    }
  }

  const generatePdf = async () => {
    try {
      console.log('Generating PDF for invoice:', invoiceId, 'with token:', accessToken)
      const blob = await InvoicesAPI.generatePublicPdf(invoiceId, accessToken)
      const url = URL.createObjectURL(blob)
      console.log('PDF generated successfully, URL:', url)
      setPdfUrl(url)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
    }
  }

  const handleShippingSelection = () => {
    setShowShippingDialog(true)
  }

  const handleShippingSuccess = () => {
    setShowShippingDialog(false)
    loadInvoice() // Reload to get updated data
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getStepIcon = (currentStep: string) => {
    switch (currentStep) {
      case 'payment':
        return step === 'payment' ? <CreditCard className="h-5 w-5 text-blue-600" /> : 
               <CheckCircle className="h-5 w-5 text-green-600" />
      case 'shipping':
        return step === 'shipping' ? <Truck className="h-5 w-5 text-blue-600" /> :
               step === 'complete' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
               <AlertCircle className="h-5 w-5 text-gray-400" />
      case 'complete':
        return step === 'complete' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
               <AlertCircle className="h-5 w-5 text-gray-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepStatus = (currentStep: string) => {
    if (step === currentStep) return 'current'
    if ((currentStep === 'payment' && (step === 'shipping' || step === 'complete')) ||
        (currentStep === 'shipping' && step === 'complete')) {
      return 'completed'
    }
    return 'upcoming'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">{error || 'The requested invoice could not be found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
              <p className="text-gray-600 mt-1">
                {invoice.client ? 
                  `${invoice.client.first_name} ${invoice.client.last_name}` :
                  `${invoice.buyer_first_name} ${invoice.buyer_last_name}`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Brand</p>
              <p className="font-semibold">{invoice.brand?.name || 'Aurum Auctions'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Progress</h2>
              
              <div className="space-y-6">
                {/* Step 1: Payment */}
                <div className={`flex items-start ${getStepStatus('payment') === 'current' ? 'text-blue-600' : getStepStatus('payment') === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className="flex-shrink-0 mr-3">
                    {getStepIcon('payment')}
                  </div>
                  <div>
                    <h3 className="font-medium">Payment</h3>
                    <p className="text-sm mt-1">
                      {getStepStatus('payment') === 'completed' ? 'Payment received' : 'Pay invoice amount'}
                    </p>
                    {getStepStatus('payment') === 'current' && invoice.payment_link && (
                      <a
                        href={invoice.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay Now
                      </a>
                    )}
                  </div>
                </div>

                {/* Step 2: Shipping */}
                <div className={`flex items-start ${getStepStatus('shipping') === 'current' ? 'text-blue-600' : getStepStatus('shipping') === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className="flex-shrink-0 mr-3">
                    {getStepIcon('shipping')}
                  </div>
                  <div>
                    <h3 className="font-medium">Shipping</h3>
                    <p className="text-sm mt-1">
                      {getStepStatus('shipping') === 'completed' ? 'Shipping method selected' : 'Select shipping method'}
                    </p>
                    {getStepStatus('shipping') === 'current' && (
                      <button
                        onClick={handleShippingSelection}
                        className="inline-flex items-center mt-2 px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Select Shipping
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 3: Complete */}
                <div className={`flex items-start ${getStepStatus('complete') === 'current' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className="flex-shrink-0 mr-3">
                    {getStepIcon('complete')}
                  </div>
                  <div>
                    <h3 className="font-medium">Complete</h3>
                    <p className="text-sm mt-1">
                      {getStepStatus('complete') === 'current' ? 'Order complete' : 'Awaiting completion'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hammer Price:</span>
                    <span>{formatCurrency(invoice.hammer_price || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Buyer's Premium:</span>
                    <span>{formatCurrency(invoice.buyers_premium || 0)}</span>
                  </div>
                  {(invoice.total_shipping_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>{formatCurrency(invoice.total_shipping_amount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid:</span>
                    <span>{formatCurrency(invoice.paid_amount || 0)}</span>
                  </div>
                  {(invoice.total_amount || 0) - (invoice.paid_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm font-medium text-red-600">
                      <span>Outstanding:</span>
                      <span>{formatCurrency((invoice.total_amount || 0) - (invoice.paid_amount || 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Document
                </h2>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    download={`invoice-${invoice.invoice_number}.pdf`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </a>
                )}
              </div>
              
              {pdfUrl ? (
                <div className="p-4">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[800px] border border-gray-300 rounded"
                    title={`Invoice ${invoice.invoice_number}`}
                  />
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading PDF...</p>
                </div>
              )}

              {/* Payment/Shipping Action */}
              {step === 'payment' && (
                <div className="p-6 bg-blue-50 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-blue-900">
                        Please pay the amount and select the shipping method
                      </h3>
                      <p className="text-blue-700 mt-1">
                        Outstanding amount: {formatCurrency((invoice.total_amount || 0) - (invoice.paid_amount || 0))}
                      </p>
                    </div>
                    {invoice.payment_link && (
                      <a
                        href={invoice.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </a>
                    )}
                  </div>
                </div>
              )}

              {step === 'shipping' && (
                <div className="p-6 bg-orange-50 border-t border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-orange-900">
                        Please select your shipping method
                      </h3>
                      <p className="text-orange-700 mt-1">
                        Payment received. Now choose how you'd like to receive your items.
                      </p>
                    </div>
                    <button
                      onClick={handleShippingSelection}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Select Shipping Method
                    </button>
                  </div>
                </div>
              )}

              {step === 'complete' && (
                <div className="p-6 bg-green-50 border-t border-green-200">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-900 mb-2">
                      Order Complete!
                    </h3>
                    <p className="text-green-700">
                      We have received your payment and shipping details. We will prepare your items for delivery soon.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Dialog */}
      {showShippingDialog && invoice && (
        <PublicShippingDialog
          isOpen={showShippingDialog}
          onClose={() => setShowShippingDialog(false)}
          invoice={invoice}
          accessToken={accessToken}
          onSuccess={handleShippingSuccess}
        />
      )}
    </div>
  )
}
