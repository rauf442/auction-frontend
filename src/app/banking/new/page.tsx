// frontend/src/app/banking/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createBankingTransaction, type BankingTransaction } from '@/lib/banking-api'

export default function NewBankingTransactionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'fee' | 'commission',
    description: '',
    amount: '',
    bank_account: '',
    reference_number: '',
    payment_method: 'bank_transfer' as 'bank_transfer' | 'credit_card' | 'debit_card' | 'cheque' | 'cash' | 'paypal' | 'stripe',
    transaction_date: new Date().toISOString().split('T')[0],
    category: '',
    currency: 'GBP'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await createBankingTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        exchange_rate: 1.0
      })
      router.push('/banking')
    } catch (error) {
      console.error('Error creating banking transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href="/banking">
          <button className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Banking
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Banking Transaction</h1>
          <p className="text-gray-600 mt-1">Create a new banking transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="transfer">Transfer</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="fee">Fee</option>
                  <option value="commission">Commission</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account
                </label>
                <input
                  type="text"
                  value={formData.bank_account}
                  onChange={(e) => handleInputChange('bank_account', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Bank account name or number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => handleInputChange('transaction_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => handleInputChange('reference_number', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="External reference number"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Describe the transaction..."
                required
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Transaction category (optional)"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/banking">
            <button type="button" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Transaction'}
          </button>
        </div>
      </form>
    </div>
  )
} 