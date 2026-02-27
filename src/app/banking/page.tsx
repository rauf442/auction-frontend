// frontend/src/app/banking/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Download, Eye, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import * as BankingAPI from '@/lib/banking-api'
import { useBrand } from '@/lib/brand-context'
import type { BankingTransaction } from '@/lib/banking-api'

export default function BankingPage() {
  const { brand } = useBrand()
  const [transactions, setTransactions] = useState<BankingTransaction[]>([])
  const [accounts, setAccounts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [reconciledFilter, setReconciledFilter] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [transactionsData, accountsData] = await Promise.all([
        BankingAPI.getBankingTransactions({
          search: searchTerm,
          type: typeFilter,
          bank_account: accountFilter,
          is_reconciled: reconciledFilter === 'true' ? true : reconciledFilter === 'false' ? false : undefined,
          brand_code: brand
        }),
        BankingAPI.getBankAccounts()
      ])
      setTransactions(transactionsData.transactions || [])
      setAccounts(accountsData)
    } catch (error) {
      console.error('Error loading banking data:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, typeFilter, accountFilter, reconciledFilter, brand])

  useEffect(() => {
    loadData()
  }, [searchTerm, typeFilter, accountFilter, reconciledFilter, brand, loadData])

  const handleReconcile = async (id: string) => {
    try {
      await BankingAPI.reconcileBankingTransaction(id, transactions.find(t => t.id === id)?.amount || 0, 'Reconciled from transaction view')
      loadData()
    } catch (error) {
      console.error('Error reconciling transaction:', error)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'bg-green-100 text-green-800'
      case 'withdrawal': return 'bg-red-100 text-red-800'
      case 'transfer': return 'bg-blue-100 text-blue-800'
      case 'fee': return 'bg-orange-100 text-orange-800'
      case 'interest': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate total balance from transactions
  const totalBalance = transactions?.filter(t => t.status === 'cleared' || t.status === 'reconciled')
  .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0) || 0;

  const unreconciledCount = transactions?.filter(t => !t.is_reconciled).length || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banking</h1>
          <p className="text-gray-600 mt-1">Manage banking transactions and reconciliation</p>
        </div>
        <Link href="/banking/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-green-600">£{totalBalance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unreconciled</p>
                <p className="text-2xl font-bold text-orange-600">{unreconciledCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bank Accounts</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((account, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-semibold">{account}</h3>
                <p className="text-sm text-gray-600">Bank Account</p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  £{totalBalance.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="fee">Fee</option>
              <option value="interest">Interest</option>
            </select>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Accounts</option>
              {accounts.map((account, index) => (
                <option key={index} value={account}>
                  {account}
                </option>
              ))}
            </select>
            <select
              value={reconciledFilter}
              onChange={(e) => setReconciledFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Transactions</option>
              <option value="true">Reconciled</option>
              <option value="false">Unreconciled</option>
            </select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Transaction #</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Account</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Balance After</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Reconciled</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{transaction.transaction_number}</td>
                      <td className="py-3 px-4">
                        <Badge className={getTypeColor(transaction.type)}>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{transaction.description}</td>
                      <td className="py-3 px-4">{transaction.bank_account}</td>
                      <td className={`py-3 px-4 font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'deposit' ? '+' : '-'}£{Math.abs(transaction.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">£{(transaction.account_balance_after || 0).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {transaction.is_reconciled ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link href={`/banking/edit/${transaction.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {!transaction.is_reconciled && transaction.status === 'cleared' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReconcile(transaction.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 