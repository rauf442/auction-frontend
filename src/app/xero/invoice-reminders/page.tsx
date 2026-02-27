// frontend/admin/src/app/xero/invoice-reminders/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getXeroInvoices, getXeroContacts } from '@/lib/xero-payments-api'
import { getBrands } from '@/lib/brands-api'
import { Bell, AlertCircle, RefreshCw, Calendar, DollarSign, User, Search, Filter, Clock, Mail } from 'lucide-react'

interface Invoice {
  invoiceID: string
  invoiceNumber: string
  contact: {
    contactID: string
    name: string
  }
  status: string
  type: string
  date: string
  dueDate: string
  total: number
  amountDue: number
  amountPaid: number
  currencyCode: string
  hasAttachments: boolean
}

interface Contact {
  contactID: string
  name: string
  emailAddress?: string
  firstName?: string
  lastName?: string
  isCustomer: boolean
  isSupplier: boolean
}

export default function XeroInvoiceRemindersPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [daysOverdueFilter, setDaysOverdueFilter] = useState<string>('all')

  // Load brands on component mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await getBrands()
        if (response.success && response.data) {
          setBrands(response.data)
        }
      } catch (err) {
        console.error('Error loading brands:', err)
      }
    }
    loadBrands()
  }, [])

  useEffect(() => {
    if (selectedBrandId) {
      fetchOverdueInvoices()
      fetchContacts()
    }
  }, [selectedBrandId])

  useEffect(() => {
    filterInvoices()
  }, [overdueInvoices, searchTerm, selectedStatus, daysOverdueFilter])

  const fetchOverdueInvoices = async () => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      const response = await getXeroInvoices(selectedBrandId, 'Status=="AUTHORISED"', 'DueDateUTC')
      
      if (response.success) {
        const invoices = response.invoices || []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Filter for overdue invoices with amount due
        const overdue = invoices.filter((invoice: Invoice) => {
          const dueDate = new Date(invoice.dueDate)
          return dueDate < today && invoice.amountDue > 0
        })
        
        setOverdueInvoices(overdue)
      } else {
        setError('Failed to fetch invoices')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    if (!selectedBrandId) return

    try {
      const response = await getXeroContacts(selectedBrandId)
      if (response.success) {
        setContacts(response.contacts || [])
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
    }
  }

  const filterInvoices = () => {
    let filtered = overdueInvoices

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.contact.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus)
    }

    // Filter by days overdue
    if (daysOverdueFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      filtered = filtered.filter(invoice => {
        const dueDate = new Date(invoice.dueDate)
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        
        switch (daysOverdueFilter) {
          case '1-30':
            return daysOverdue >= 1 && daysOverdue <= 30
          case '31-60':
            return daysOverdue >= 31 && daysOverdue <= 60
          case '61-90':
            return daysOverdue >= 61 && daysOverdue <= 90
          case '90+':
            return daysOverdue > 90
          default:
            return true
        }
      })
    }

    setFilteredInvoices(filtered)
  }

  const getContactEmail = (contactId: string) => {
    const contact = contacts.find(c => c.contactID === contactId)
    return contact?.emailAddress || 'No email'
  }

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getOverdueColor = (daysOverdue: number) => {
    if (daysOverdue >= 90) return 'bg-red-100 text-red-800'
    if (daysOverdue >= 60) return 'bg-orange-100 text-orange-800'
    if (daysOverdue >= 30) return 'bg-yellow-100 text-yellow-800'
    return 'bg-blue-100 text-blue-800'
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalOverdueAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0)
  const averageDaysOverdue = filteredInvoices.length > 0 
    ? Math.round(filteredInvoices.reduce((sum, invoice) => sum + getDaysOverdue(invoice.dueDate), 0) / filteredInvoices.length)
    : 0

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          Xero Invoice Reminders
        </h1>
        <p className="text-gray-600">Manage invoice reminders and payment follow-ups from your Xero account</p>
      </div>

      <div className="grid gap-6">
        {/* Brand Selector */}
        <BrandSelector
          selectedBrandId={selectedBrandId}
          onBrandSelect={setSelectedBrandId}
        />

        {/* Summary Cards */}
        {selectedBrandId && !loading && !error && filteredInvoices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-sm text-gray-600">Overdue Invoices</div>
                    <div className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-orange-600" />
                  <div>
                    <div className="text-sm text-gray-600">Total Amount Due</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredInvoices.length > 0 ? formatCurrency(totalOverdueAmount, filteredInvoices[0].currencyCode) : '$0'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-sm text-gray-600">Avg Days Overdue</div>
                    <div className="text-2xl font-bold text-gray-900">{averageDaysOverdue}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invoice Reminders Content */}
        {selectedBrandId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Overdue Invoices Requiring Reminders
                </CardTitle>
                <button
                  onClick={fetchOverdueInvoices}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Filters */}
              {!loading && !error && overdueInvoices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="AUTHORISED">Authorised</option>
                    <option value="PAID">Paid</option>
                  </select>
                  <select
                    value={daysOverdueFilter}
                    onChange={(e) => setDaysOverdueFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Overdue</option>
                    <option value="1-30">1-30 days</option>
                    <option value="31-60">31-60 days</option>
                    <option value="61-90">61-90 days</option>
                    <option value="90+">90+ days</option>
                  </select>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Filter className="h-4 w-4" />
                    {filteredInvoices.length} of {overdueInvoices.length}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading overdue invoices...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              )}

              {!loading && !error && overdueInvoices.length === 0 && (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Overdue Invoices!</h3>
                  <p className="text-gray-600">All invoices are up to date. Great job!</p>
                </div>
              )}

              {!loading && !error && filteredInvoices.length === 0 && overdueInvoices.length > 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Invoices</h3>
                  <p className="text-gray-600">No invoices match your current filters.</p>
                </div>
              )}

              {!loading && !error && filteredInvoices.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Invoice #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Due Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Amount Due</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Days Overdue</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => {
                        const daysOverdue = getDaysOverdue(invoice.dueDate)
                        const contactEmail = getContactEmail(invoice.contact.contactID)
                        
                        return (
                          <tr key={invoice.invoiceID} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                              <div className="text-xs text-gray-400 font-mono">{invoice.invoiceID}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900">{invoice.contact.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{contactEmail}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-red-600 font-medium">{formatDate(invoice.dueDate)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-red-600">
                                {formatCurrency(invoice.amountDue, invoice.currencyCode)}
                              </div>
                              {invoice.amountPaid > 0 && (
                                <div className="text-xs text-gray-500">
                                  Paid: {formatCurrency(invoice.amountPaid, invoice.currencyCode)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getOverdueColor(daysOverdue)}>
                                {daysOverdue} days
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Implement send reminder functionality
                                    console.log('Send reminder for invoice:', invoice.invoiceID)
                                    alert(`Send reminder feature would be implemented here for invoice ${invoice.invoiceNumber}`)
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  disabled={contactEmail === 'No email'}
                                >
                                  <Mail className="h-3 w-3" />
                                  Send Reminder
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}