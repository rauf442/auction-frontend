// frontend/src/app/refunds/new-invoice/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, FileText, Calculator } from 'lucide-react'
import Link from 'next/link'
import { createRefund } from '@/lib/refunds-api'
import { getInvoicesForRefund, Invoice } from '@/lib/invoices-api'
import StaffDropdown from '@/components/ui/staff-dropdown'

export default function NewInvoiceRefundPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const [formData, setFormData] = useState({
    type: 'refund_of_artwork' as 'refund_of_artwork' | 'refund_of_courier_difference',
    reason: '',
    amount: '0',
    invoice_id: '',
    refund_method: 'bank_transfer' as 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'store_credit',
    internal_notes: '',
    client_notes: '',
    
    // Auto-populated from selected invoice
    hammer_price: '0',
    buyers_premium: '0',
    shipping_difference: '0',
    international_shipping_cost: '0',
    local_shipping_cost: '0',
    handling_insurance_cost: '0',
    
    item_returned_by: '' // Staff member who confirmed item return
  })

  useEffect(() => {
    loadInvoices()
    // Preselect invoice if provided via query param
    const url = new URL(window.location.href)
    const iid = url.searchParams.get('invoice_id')
    if (iid) {
      setFormData(prev => ({ ...prev, invoice_id: iid }))
    }
  }, [])

  useEffect(() => {
    if (formData.invoice_id) {
      const invoice = invoices.find(inv => inv.id === parseInt(formData.invoice_id))
      if (invoice) {
        setSelectedInvoice(invoice)
        populateInvoiceData(invoice)
      }
    } else {
      setSelectedInvoice(null)
      resetInvoiceData()
    }
  }, [formData.invoice_id, invoices])

  useEffect(() => {
    calculateRefundAmount()
  }, [formData.type, formData.hammer_price, formData.buyers_premium, formData.shipping_difference, formData.international_shipping_cost, formData.local_shipping_cost, formData.handling_insurance_cost])

  const loadInvoices = async () => {
    try {
      const invoicesResponse = await getInvoicesForRefund()
      setInvoices(invoicesResponse.data || [])
    } catch (error) {
      console.error('Error loading invoices:', error)
    }
  }

  const populateInvoiceData = (invoice: Invoice) => {
    setFormData(prev => ({
      ...prev,
      hammer_price: String(invoice.hammer_price || 0),
      buyers_premium: String(invoice.buyers_premium || 0),
      international_shipping_cost: String(invoice.total_shipping_amount || 0),
      local_shipping_cost: String(invoice.shipping_charge || 0),
      handling_insurance_cost: String (invoice.insurance_charge || 0)
    }))
  }

  const resetInvoiceData = () => {
    setFormData(prev => ({
      ...prev,
      hammer_price: '0',
      buyers_premium: '0',
      shipping_difference: '0',
      international_shipping_cost: '0',
      local_shipping_cost: '0',
      handling_insurance_cost: '0'
    }))
  }

  const calculateRefundAmount = () => {
    let amount = 0
    
    if (formData.type === 'refund_of_artwork') {
      // Hammer Price + Buyer's Premium (without logistics)
      const hammerPrice = parseFloat(formData.hammer_price) || 0
      const buyersPremium = parseFloat(formData.buyers_premium) || 0
      amount = hammerPrice + buyersPremium
    } else if (formData.type === 'refund_of_courier_difference') {
      // Shipping Plus Handling & Insurance difference
      const intlShipping = parseFloat(formData.international_shipping_cost) || 0
      const localShipping = parseFloat(formData.local_shipping_cost) || 0
      const handlingInsurance = parseFloat(formData.handling_insurance_cost) || 0
      amount = intlShipping - localShipping + handlingInsurance
    }
    
    setFormData(prev => ({ ...prev, amount: amount.toFixed(2) }))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedInvoice) {
      alert('Please select an invoice')
      return
    }

    try {
      setLoading(true)
      
      const refundData = {
        type: formData.type,
        reason: formData.reason,
        amount: parseFloat(formData.amount),
        invoice_id: parseInt(formData.invoice_id),
        refund_method: formData.refund_method,
        internal_notes: formData.internal_notes,
        client_notes: formData.client_notes,
        hammer_price: parseFloat(formData.hammer_price) || 0,
        buyers_premium: parseFloat(formData.buyers_premium) || 0,
        shipping_difference: parseFloat(formData.shipping_difference) || 0,
        international_shipping_cost: parseFloat(formData.international_shipping_cost) || 0,
        local_shipping_cost: parseFloat(formData.local_shipping_cost) || 0,
        handling_insurance_cost: parseFloat(formData.handling_insurance_cost) || 0,
        item_returned_by: formData.item_returned_by ? parseInt(formData.item_returned_by) : undefined
      }

      await createRefund(refundData)
      router.push('/refunds')
    } catch (error) {
      console.error('Error creating refund:', error)
      alert('Failed to create refund. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href="/refunds">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Refunds
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Refund (Invoice-Based)</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Select Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invoice_id">Invoice *</Label>
              <select
                id="invoice_id"
                value={formData.invoice_id}
                onChange={(e) => handleInputChange('invoice_id', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                required
              >
                <option value="">Select an invoice...</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {invoice.buyer_first_name && invoice.buyer_last_name ? `${invoice.buyer_first_name} ${invoice.buyer_last_name}` : invoice.buyer_email || 'Client'} - £{Number(invoice.total_amount || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Client:</span> {selectedInvoice.buyer_first_name && selectedInvoice.buyer_last_name ? `${selectedInvoice.buyer_first_name} ${selectedInvoice.buyer_last_name}` : selectedInvoice.buyer_email || 'Unknown Client'}
                  </div>
                  <div>
                    <span className="font-medium">Total Amount:</span> £{Number(selectedInvoice.total_amount || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Hammer Price:</span> £{Number(selectedInvoice.hammer_price || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Buyer's Premium:</span> £{Number(selectedInvoice.buyers_premium || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Shipping:</span> £{Number(selectedInvoice.shipping_charge || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Platform:</span> {selectedInvoice.platform || 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refund Type and Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Refund Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Refund Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                required
              >
                <option value="refund_of_artwork">
                  Refund of Artwork: Full Refund (Hammer Price + Buyer's Premium) - without logistics
                </option>
                <option value="refund_of_courier_difference">
                  Refund of Courier Difference: International Vs Local (Shipping + Handling & Insurance)
                </option>
              </select>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Refund *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                rows={3}
                placeholder="Explain why this refund is being issued..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Calculated Refund Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  readOnly
                  className="bg-gray-50 font-medium"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Auto-calculated based on refund type
                </p>
              </div>

              <div>
                <Label htmlFor="refund_method">Refund Method *</Label>
                <select
                  id="refund_method"
                  value={formData.refund_method}
                  onChange={(e) => handleInputChange('refund_method', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card Refund</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="store_credit">Store Credit</option>
                </select>
              </div>
            </div>

            <StaffDropdown
              value={formData.item_returned_by}
              onChange={(value) => handleInputChange('item_returned_by', value)}
              label="Item Returned By (Staff Member)"
              placeholder="Select staff member who confirmed return..."
              id="item_returned_by"
            />
          </CardContent>
        </Card>

        {/* Breakdown (Read-only, for transparency) */}
        {selectedInvoice && (
          <Card>
            <CardHeader>
              <CardTitle>Refund Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Hammer Price</Label>
                  <Input value={`£${formData.hammer_price}`} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label>Buyer's Premium</Label>
                  <Input value={`£${formData.buyers_premium}`} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label>International Shipping</Label>
                  <Input value={`£${formData.international_shipping_cost}`} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label>Local Shipping</Label>
                  <Input value={`£${formData.local_shipping_cost}`} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label>Handling & Insurance</Label>
                  <Input value={`£${formData.handling_insurance_cost}`} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label className="font-medium">Total Refund Amount</Label>
                  <Input value={`£${formData.amount}`} readOnly className="bg-blue-50 font-bold" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="client_notes">Client Notes</Label>
              <Textarea
                id="client_notes"
                value={formData.client_notes}
                onChange={(e) => handleInputChange('client_notes', e.target.value)}
                rows={2}
                placeholder="Notes visible to the client..."
              />
            </div>

            <div>
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                rows={2}
                placeholder="Internal notes for staff only..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href="/refunds">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !selectedInvoice}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create Refund'}
          </Button>
        </div>
      </form>
    </div>
  )
}
