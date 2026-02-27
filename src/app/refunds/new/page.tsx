// frontend/src/app/refunds/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { createRefund } from '@/lib/refunds-api'
import { fetchClients, type Client } from '@/lib/clients-api'
import { ArtworksAPI, type Artwork } from '@/lib/items-api'
import { getAuction } from '@/lib/auctions-api'
import { getAuctions, type Auction } from '@/lib/auctions-api'
import StaffDropdown from '@/components/ui/staff-dropdown'

export default function NewRefundPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [items, setItems] = useState<Artwork[]>([])
    const [auctions, setAuctions] = useState<Auction[]>([])
    const [auctionItems, setAuctionItems] = useState<Artwork[]>([])
    const [selectedItems, setSelectedItems] = useState<string[]>([])

    const [formData, setFormData] = useState({
        type: 'refund_of_artwork' as 'refund_of_artwork' | 'refund_of_courier_difference',
        reason: '',
        amount: '',
        client_id: '',
        item_id: '',
        auction_id: '',
        refund_method: 'bank_transfer' as 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'store_credit',
        payment_method: '',
        returned_by: '',
        internal_notes: '',
        client_notes: '',
        // Enhanced refund fields
        hammer_price: '',
        buyers_premium: '',
        logistics_cost: '',
        international_shipping: '',
        local_shipping: '',
        handling_insurance: ''
    })

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (formData.auction_id) {
            loadAuctionItems()
        } else {
            setAuctionItems([])
            setSelectedItems([])
        }
    }, [formData.auction_id])

    useEffect(() => {
        calculateRefundAmount()
    }, [formData.type, formData.hammer_price, formData.buyers_premium, formData.logistics_cost, formData.international_shipping, formData.local_shipping, formData.handling_insurance])

    const loadInitialData = async () => {
        try {
            const [clientsData, itemsData, auctionsData] = await Promise.all([
                fetchClients({ limit: 5000 }),
                ArtworksAPI.getArtworks({ limit: 5000 }),
                getAuctions({ limit: 5000 })
            ])
            setClients(clientsData.data || [])
            setItems(itemsData.data || [])
            setAuctions(auctionsData.auctions || [])
        } catch (error) {
            console.error('Error loading initial data:', error)
        }
    }

    const loadAuctionItems = async () => {
        try {
            if (!formData.auction_id) {
                setAuctionItems([])
                return
            }

            // Get auction first to get artwork_ids
            const auction = await getAuction(formData.auction_id)
            if (!auction.artwork_ids || auction.artwork_ids.length === 0) {
                setAuctionItems([])
                return
            }

            // Get items using artwork_ids
            const itemsData = await ArtworksAPI.getArtworks({
                item_ids: auction.artwork_ids.map(id => id.toString()),
                limit: 1000,
                status: 'sold' // Only show sold items for refunds
            })
            setAuctionItems(itemsData.data || [])
        } catch (error) {
            console.error('Error loading auction items:', error)
        }
    }

    const calculateRefundAmount = () => {
        let amount = 0
        
        if (formData.type === 'refund_of_artwork') {
            // Hammer Price + Buyer's Premium (without logistics)
            const hammerPrice = parseFloat(formData.hammer_price) || 0
            const buyersPremium = parseFloat(formData.buyers_premium) || 0
            amount = hammerPrice + buyersPremium
        } else if (formData.type === 'refund_of_courier_difference') {
            // Difference between International and Local courier charges
            const international = parseFloat(formData.international_shipping) || 0
            const local = parseFloat(formData.local_shipping) || 0
            const handlingInsurance = parseFloat(formData.handling_insurance) || 0
            amount = Math.max(0, international - local + handlingInsurance)
        }
        
        if (amount > 0) {
            setFormData(prev => ({ ...prev, amount: amount.toString() }))
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setLoading(true)
            
            const refundData: any = {
                ...formData,
                amount: parseFloat(formData.amount),
                hammer_price: formData.hammer_price ? parseFloat(formData.hammer_price) : undefined,
                buyers_premium: formData.buyers_premium ? parseFloat(formData.buyers_premium) : undefined,
                logistics_cost: formData.logistics_cost ? parseFloat(formData.logistics_cost) : undefined,
                international_shipping: formData.international_shipping ? parseFloat(formData.international_shipping) : undefined,
                local_shipping: formData.local_shipping ? parseFloat(formData.local_shipping) : undefined,
                handling_insurance: formData.handling_insurance ? parseFloat(formData.handling_insurance) : undefined
            }
            
            // Handle multiple items for partial refunds
            if (selectedItems.length > 0) {
                refundData.item_ids = selectedItems
            }
            
            await createRefund(refundData)
            router.push('/refunds')
        } catch (error) {
            console.error('Error creating refund:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleItemSelection = (itemId: string) => {
        setSelectedItems(prev => 
            prev.includes(itemId) 
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        )
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center mb-6">
                <Link href="/refunds">
                    <Button variant="outline" size="sm" className="mr-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Refunds
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">New Refund</h1>
                    <p className="text-gray-600 mt-1">Create a new refund request</p>
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
                                <Label htmlFor="refund_type">Refund Type</Label>
                                <select
                                    id="refund_type"
                                    value={formData.type}
                                    onChange={(e) => handleInputChange('type', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                                    required
                                >
                                    <option value="refund_of_artwork">Refund of Artwork (Hammer Price + Buyer's Premium)</option>
                                    <option value="refund_of_courier_difference">Refund of Courier Difference (International vs Local)</option>
                                </select>
                            </div>

                            {/* Client is derived from invoice; remove direct selection */}

                            {/* Auction is derived from invoice; remove direct selection */}

                            {/* Partial Refund - Multiple Items Selection */}
                            {formData.auction_id && auctionItems.length > 0 && (
                                <div>
                                    <Label>Select Items for Partial Refund</Label>
                                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 mt-1">
                                        {auctionItems.map((item) => (
                                            <div key={item.id} className="flex items-center space-x-2 py-1">
                                                <input
                                                    type="checkbox"
                                                    id={`item-${item.id}`}
                                                    checked={selectedItems.includes(item.id!)}
                                                    onChange={() => toggleItemSelection(item.id!)}
                                                    className="rounded"
                                                />
                                                <label htmlFor={`item-${item.id}`} className="text-sm">
                                                    Lot {item.lot_num}: {item.title} (£{item.low_est} - £{item.high_est})
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedItems.length > 0 && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {selectedItems.length} item(s) selected for refund
                                        </p>
                                    )}
                                </div>
                            )}

                            <StaffDropdown
                                value={formData.returned_by}
                                onChange={(value) => handleInputChange('returned_by', value)}
                                label="Item Returned By"
                                placeholder="Select staff member who processed the return..."
                                id="returned_by"
                            />
                        </CardContent>
                    </Card>

                    {/* Refund Details & Calculation */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Refund Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Show relevant fields based on refund type */}
                            {formData.type === 'refund_of_artwork' && (
                                <>
                                    <div>
                                        <Label htmlFor="hammer_price">Hammer Price (£)</Label>
                                        <Input
                                            id="hammer_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.hammer_price}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('hammer_price', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="buyers_premium">Buyer's Premium (£)</Label>
                                        <Input
                                            id="buyers_premium"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.buyers_premium}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('buyers_premium', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.type === 'refund_of_courier_difference' && (
                                <>
                                    <div>
                                        <Label htmlFor="international_shipping">International Shipping (£)</Label>
                                        <Input
                                            id="international_shipping"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.international_shipping}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('international_shipping', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="local_shipping">Local Shipping (£)</Label>
                                        <Input
                                            id="local_shipping"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.local_shipping}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('local_shipping', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="handling_insurance">Handling & Insurance (£)</Label>
                                        <Input
                                            id="handling_insurance"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.handling_insurance}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('handling_insurance', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <Label htmlFor="amount">Total Refund Amount (£)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('amount', e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className={formData.type.startsWith('refund_of_') ? 'bg-gray-100' : ''}
                                    readOnly={formData.type.startsWith('refund_of_')}
                                />
                                {formData.type.startsWith('refund_of_') && (
                                    <p className="text-xs text-gray-500 mt-1">Amount calculated automatically based on refund type</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="payment_method">Refund Payment Method</Label>
                                <Input
                                    id="payment_method"
                                    value={formData.payment_method}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('payment_method', e.target.value)}
                                    placeholder="e.g., Bank Transfer to Account ending 1234"
                                />
                            </div>

                            <div>
                                <Label htmlFor="refund_method">Original Payment Method</Label>
                                <select
                                    id="refund_method"
                                    value={formData.refund_method}
                                    onChange={(e) => handleInputChange('refund_method', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                                    required
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="cash">Cash</option>
                                    <option value="store_credit">Store Credit</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Reason and Notes Section */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Reason & Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="reason">Reason for Refund</Label>
                            <Textarea
                                id="reason"
                                value={formData.reason}
                                onChange={(e) => handleInputChange('reason', e.target.value)}
                                placeholder="Please provide the reason for this refund..."
                                rows={4}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="internal_notes">Internal Notes</Label>
                            <Textarea
                                id="internal_notes"
                                value={formData.internal_notes}
                                onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                                placeholder="Any internal notes or additional information..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-4 mt-6">
                    <Link href="/refunds">
                        <Button variant="outline" type="button">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Creating...' : 'Create Refund'}
                    </Button>
                </div>
            </form>
        </div>
    )
} 