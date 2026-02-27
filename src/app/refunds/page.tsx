// frontend/src/app/refunds/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, Download, Eye, Check, X } from 'lucide-react'
import Link from 'next/link'
import * as RefundsAPI from '@/lib/refunds-api'
import { Refund } from '@/lib/refunds-api'
import { useBrand } from '@/lib/brand-context'

export default function RefundsPage() {
  const { brand } = useBrand()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const loadRefunds = async () => {
    try {
      setLoading(true)
      const data = await RefundsAPI.getRefunds({
        search: searchTerm,
        status: statusFilter,
        type: typeFilter,
        brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
      })
      setRefunds(data.refunds)
    } catch (error) {
      console.error('Error loading refunds:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRefunds()
  }, [searchTerm, statusFilter, typeFilter, brand])

  const handleApprove = async (id: string) => {
    try {
      await RefundsAPI.approveRefund(id, 'Approved from table view')
      loadRefunds()
    } catch (error) {
      console.error('Error approving refund:', error)
    }
  }

  const handleProcess = async (id: string) => {
    try {
      await RefundsAPI.processRefund(id, 'completed')
      loadRefunds()
    } catch (error) {
      console.error('Error processing refund:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'processed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'refund_of_artwork': return 'bg-green-100 text-green-800'
      case 'refund_of_courier_difference': return 'bg-indigo-100 text-indigo-800'
      case 'item_return': return 'bg-purple-100 text-purple-800'
      case 'overpayment': return 'bg-blue-100 text-blue-800'
      case 'cancelled_sale': return 'bg-orange-100 text-orange-800'
      case 'damaged_item': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'refund_of_artwork': return 'Artwork Refund'
      case 'refund_of_courier_difference': return 'Courier Difference'
      case 'item_return': return 'Item Return'
      case 'overpayment': return 'Overpayment'
      case 'cancelled_sale': return 'Cancelled Sale'
      case 'damaged_item': return 'Damaged Item'
      default: return type.replace('_', ' ')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refunds</h1>
          <p className="text-gray-600 mt-1">Manage refund requests and approvals</p>
        </div>
        <Link href="/refunds/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Refund
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search refunds..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processed">Processed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="refund_of_artwork">Artwork Refund</option>
              <option value="refund_of_courier_difference">Courier Difference</option>
            </select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Refunds List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading refunds...</div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No refunds found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Refund #</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Item/Auction</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{refund.refund_number}</td>
                      <td className="py-3 px-4">
                        <Badge className={getTypeColor(refund.type)}>
                          {getTypeLabel(refund.type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{refund.client_name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {refund.item_title || refund.auction_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4">£{refund.amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(refund.status)}>
                          {refund.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(refund.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link href={`/refunds/edit/${refund.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {refund.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(refund.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {refund.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcess(refund.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Process
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