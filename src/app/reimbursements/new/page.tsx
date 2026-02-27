// frontend/src/app/reimbursements/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import * as ReimbursementsAPI from '@/lib/reimbursements-api'
import StaffDropdown from '@/components/ui/staff-dropdown'

export default function NewReimbursementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
  const [formData, setFormData] = useState({
    category: 'food' as 'food' | 'fuel' | 'internal_logistics' | 'international_logistics' | 'stationary' | 'travel' | 'accommodation' | 'other',
    title: '',
    description: '',
    total_amount: '',
    requested_by: '', // Staff member ID
    payment_date: new Date().toISOString().split('T')[0],
    receipt_numbers: '',
    vendor_name: '',
    purpose: '',
    internal_notes: '',
    currency: 'GBP',
    payment_method: 'card' as 'cash' | 'card' | 'bank_transfer' | 'other',
    tax_amount: '0',
    tax_rate: '0.20', // Default UK VAT rate
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  })

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      
      // Upload receipts first if any
      let receiptUrls: string[] = []
      if (uploadedFiles.length > 0) {
        receiptUrls = await uploadReceipts()
      }
      
      const reimbursementData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : 0,
        tax_rate: parseFloat(formData.tax_rate),
        net_amount: parseFloat(formData.total_amount) - (formData.tax_amount ? parseFloat(formData.tax_amount) : 0),
        receipt_urls: receiptUrls,
        has_receipts: uploadedFiles.length > 0
      }
      // Frontend validation for required fields per backend
      const missing: string[] = []
      if (!reimbursementData.title) missing.push('title')
      if (!reimbursementData.description) missing.push('description')
      if (!reimbursementData.total_amount) missing.push('total_amount')
      if (!reimbursementData.category) missing.push('category')
      if (!reimbursementData.payment_method) missing.push('payment_method')
      if (!reimbursementData.payment_date) missing.push('payment_date')
      if (!reimbursementData.purpose) missing.push('purpose')
      if (missing.length) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`)
      }
      
      await ReimbursementsAPI.createReimbursement(reimbursementData)
      router.push('/reimbursements')
    } catch (error) {
      console.error('Error creating reimbursement:', error)
      alert('Error creating reimbursement: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const uploadReceipts = async (): Promise<string[]> => {
    // Mock implementation - in real app, this would upload to backend/Supabase storage
    const urls: string[] = []
    for (const file of uploadedFiles) {
      // Simulate upload by creating a mock URL
      const mockUrl = `receipts/${Date.now()}_${file.name}`
      urls.push(mockUrl)
    }
    return urls
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })
    
    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      // Auto-calculate tax amount when total_amount or tax_rate changes
      if (field === 'total_amount' || field === 'tax_rate') {
        const totalAmount = parseFloat(field === 'total_amount' ? value : prev.total_amount) || 0;
        const taxRate = parseFloat(field === 'tax_rate' ? value : prev.tax_rate) || 0;
        const taxAmount = totalAmount * taxRate;
        newFormData.tax_amount = taxAmount.toFixed(2);
      }
      
      return newFormData;
    });
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href="/reimbursements">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reimbursements
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Reimbursement Request</h1>
          <p className="text-gray-600 mt-1">Submit a new expense reimbursement request for approval</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief description of expense"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                  required
                >
                  <option value="food">Food & Meals</option>
                  <option value="fuel">Fuel & Transportation</option>
                  <option value="internal_logistics">Internal Logistics</option>
                  <option value="international_logistics">International Logistics</option>
                  <option value="stationary">Stationary & Office Supplies</option>
                  <option value="travel">Travel</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <StaffDropdown
                value={formData.requested_by}
                onChange={(value) => handleInputChange('requested_by', value)}
                label="Requested By (Staff Member) *"
                placeholder="Select staff member..."
                required
                id="requested_by"
              />


            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="total_amount">Total Amount (£) *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_amount}
                  onChange={(e) => handleInputChange('total_amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tax_amount">Tax Amount (£) *</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax_amount}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-calculated"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Auto-calculated based on total amount × tax rate
                </p>
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method *</Label>
                <select
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                  required
                >
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="payment_date">Expense Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="vendor_name">Vendor/Supplier</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                  placeholder="Who was paid?"
                />
              </div>

              <div>
                <Label htmlFor="receipt_numbers">Receipt/Invoice Numbers</Label>
                <Input
                  id="receipt_numbers"
                  value={formData.receipt_numbers}
                  onChange={(e) => handleInputChange('receipt_numbers', e.target.value)}
                  placeholder="Receipt or invoice numbers"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description & Attachments */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Description & Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Describe the expense and its business purpose..."
                required
              />
            </div>

            <div>
              <Label htmlFor="purpose">Business Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                rows={2}
                placeholder="Why was this expense necessary for business?"
                required
              />
            </div>

            <div>
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                rows={2}
                placeholder="Any additional notes or comments..."
              />
            </div>

            <div>
              <Label>Receipt Attachments</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload receipts, invoices, or supporting documents
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PNG, JPG, PDF up to 10MB each
                      </span>
                    </Label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>
              
              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Uploaded Files:</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/reimbursements">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  )
} 