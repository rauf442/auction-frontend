// frontend/src/app/reimbursements/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Download, Eye, Check, Clock, User } from 'lucide-react'
import Link from 'next/link'
import * as ReimbursementsAPI from '@/lib/reimbursements-api'
import { useBrand } from '@/lib/brand-context'
import type { Reimbursement } from '@/lib/reimbursements-api'

export default function ReimbursementsPage() {
    const { brand } = useBrand()
    const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')

    const loadReimbursements = async () => {
        try {
            setLoading(true)
            const data = await ReimbursementsAPI.getReimbursements({
                search: searchTerm,
                status: statusFilter,
                category: categoryFilter,
                brand_code: brand
            })
            setReimbursements(data.reimbursements)
        } catch (error) {
            console.error('Error loading reimbursements:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadReimbursements()
  }, [searchTerm, statusFilter, categoryFilter, brand])

    const handleDirector1Approval = async (id: string) => {
        try {
            await ReimbursementsAPI.approveDirector1(id, true, 'Approved by Director 1')
            loadReimbursements()
        } catch (error) {
            console.error('Error approving reimbursement (Director 1):', error)
        }
    }

    const handleDirector2Approval = async (id: string) => {
        try {
            await ReimbursementsAPI.approveDirector2(id, true, 'Approved by Director 2')
            loadReimbursements()
        } catch (error) {
            console.error('Error approving reimbursement (Director 2):', error)
        }
    }

    const handleAccountantApproval = async (id: string) => {
        try {
            await ReimbursementsAPI.approveAccountant(id, true, 'Approved by Accountant')
            loadReimbursements()
        } catch (error) {
            console.error('Error approving reimbursement (Accountant):', error)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'director1_approved': return 'bg-blue-100 text-blue-800'
            case 'director2_approved': return 'bg-purple-100 text-purple-800'
            case 'fully_approved': return 'bg-green-100 text-green-800'
            case 'paid': return 'bg-green-100 text-green-800'
            case 'rejected': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'food': return 'bg-orange-100 text-orange-800'
            case 'fuel': return 'bg-red-100 text-red-800'
            case 'logistics_internal': return 'bg-blue-100 text-blue-800'
            case 'logistics_international': return 'bg-indigo-100 text-indigo-800'
            case 'stationary': return 'bg-green-100 text-green-800'
            case 'travel': return 'bg-purple-100 text-purple-800'
            case 'accommodation': return 'bg-pink-100 text-pink-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getApprovalStatus = (reimbursement: Reimbursement) => {
        const approvals = []

        if (reimbursement.director1_approval_status === 'approved') {
            approvals.push(<Check key="d1" className="w-4 h-4 text-green-600" />)
        } else {
            approvals.push(<Clock key="d1" className="w-4 h-4 text-yellow-600" />)
        }

        if (reimbursement.director2_approval_status === 'approved') {
            approvals.push(<Check key="d2" className="w-4 h-4 text-green-600" />)
        } else {
            approvals.push(<Clock key="d2" className="w-4 h-4 text-yellow-600" />)
        }

        if (reimbursement.accountant_approval_status === 'approved') {
            approvals.push(<Check key="acc" className="w-4 h-4 text-green-600" />)
        } else {
            approvals.push(<Clock key="acc" className="w-4 h-4 text-yellow-600" />)
        }

        return <div className="flex space-x-1">{approvals}</div>
    }

    const pendingCount = reimbursements.filter(r => r.status === 'pending').length
    const totalAmount = reimbursements.reduce((sum, r) => sum + r.total_amount, 0)
    const approvedAmount = reimbursements
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.total_amount, 0)

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reimbursements</h1>
                    <p className="text-gray-600 mt-1">Manage expense reimbursements with 3-stage approval</p>
                </div>
                <Link href="/reimbursements/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Reimbursement
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending Approval</p>
                                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Requests</p>
                                <p className="text-2xl font-bold">{reimbursements.length}</p>
                            </div>
                            <User className="w-8 h-8 text-gray-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold">£{totalAmount.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Approved Amount</p>
                                <p className="text-2xl font-bold text-green-600">£{approvedAmount.toFixed(2)}</p>
                            </div>
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
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
                                placeholder="Search reimbursements..."
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="pl-10"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="director1_approved">Director 1 Approved</option>
                            <option value="director2_approved">Director 2 Approved</option>
                            <option value="fully_approved">Fully Approved</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        {/* Brand filter removed; now using global brand context */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">All Categories</option>
                            <option value="food">Food</option>
                            <option value="fuel">Fuel</option>
                            <option value="logistics_internal">Internal Logistics</option>
                            <option value="logistics_international">International Logistics</option>
                            <option value="stationary">Stationary</option>
                            <option value="travel">Travel</option>
                            <option value="accommodation">Accommodation</option>
                            <option value="other">Other</option>
                        </select>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Reimbursements Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Reimbursement Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading reimbursements...</div>
                    ) : reimbursements.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No reimbursements found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Request #</th>
                                        <th className="text-left py-3 px-4">Brand</th>
                                        <th className="text-left py-3 px-4">Employee</th>
                                        <th className="text-left py-3 px-4">Category</th>
                                        <th className="text-left py-3 px-4">Description</th>
                                        <th className="text-left py-3 px-4">Amount</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                        <th className="text-left py-3 px-4">Approvals (D1|D2|Acc)</th>
                                        <th className="text-left py-3 px-4">Created</th>
                                        <th className="text-left py-3 px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reimbursements.map((reimbursement) => (
                                        <tr key={reimbursement.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium">{reimbursement.reimbursement_number}</td>
                                            <td className="py-3 px-4">{reimbursement.brand_code || '-'}</td>
                                            <td className="py-3 px-4">{reimbursement.requested_by_name || '-'}</td>
                                            <td className="py-3 px-4">
                                                <Badge className={getCategoryColor(reimbursement.category)}>
                                                    {reimbursement.category.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs truncate">{reimbursement.description}</td>
                                            <td className="py-3 px-4 font-medium">£{reimbursement.total_amount.toFixed(2)}</td>
                                            <td className="py-3 px-4">
                                                <Badge className={getStatusColor(reimbursement.status)}>
                                                    {reimbursement.status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">{getApprovalStatus(reimbursement)}</td>
                                            <td className="py-3 px-4">
                                                {new Date(reimbursement.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex space-x-2">
                                                    <Link href={`/reimbursements/edit/${reimbursement.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    {reimbursement.status === 'pending' && reimbursement.director1_approval_status !== 'approved' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDirector1Approval(reimbursement.id)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                            title="Approve as Director 1"
                                                        >
                                                            D1
                                                        </Button>
                                                    )}
                                                    {reimbursement.director1_approval_status === 'approved' && reimbursement.director2_approval_status !== 'approved' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDirector2Approval(reimbursement.id)}
                                                            className="text-purple-600 hover:text-purple-700"
                                                            title="Approve as Director 2"
                                                        >
                                                            D2
                                                        </Button>
                                                    )}
                                                    {reimbursement.director2_approval_status === 'approved' && reimbursement.accountant_approval_status !== 'approved' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAccountantApproval(reimbursement.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                            title="Approve as Accountant"
                                                        >
                                                            Acc
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