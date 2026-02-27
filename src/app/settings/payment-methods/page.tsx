// frontend/src/app/settings/payment-methods/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import XeroConfiguration from '@/components/settings/XeroConfiguration'
import XeroPaymentGenerator from '@/components/payments/XeroPaymentGenerator'
import StripeConfiguration from '@/components/settings/StripeConfiguration'
import StripePaymentGenerator from '@/components/payments/StripePaymentGenerator'

type Brand = { id: string; code: string; name: string }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export default function PaymentMethodsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('MSABER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE_URL}/brands`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const data = await res.json()
      if (data.success) setBrands(data.data)
    } catch (err: any) {
      setError('Failed to load brands')
    }
  }

  useEffect(() => { 
    fetchBrands() 
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>
      
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Brand</label>
          <select 
            className="border rounded px-3 py-1" 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            {brands.map(b => (
              <option key={b.id} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white p-6">
        {error && <div className="mb-4 text-red-600">{error}</div>}
        
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-8 max-w-4xl">
            
            {/* Xero Payment Integration */}
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900">Xero Payment Integration</h2>
                <p className="text-gray-600 mt-1">Create invoices and payment links through Xero</p>
              </div>
              
              <XeroConfiguration
                brandId={brands.find(b => b.code === selectedBrand)?.id || selectedBrand}
                brandName={brands.find(b => b.code === selectedBrand)?.name || selectedBrand}
                selectedBrand={selectedBrand}
              />
              
              <XeroPaymentGenerator 
                brandId={brands.find(b => b.code === selectedBrand)?.id || selectedBrand}
              />
            </div>

            {/* Stripe Payment Integration */}
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900">Stripe Payment Integration</h2>
                <p className="text-gray-600 mt-1">Accept online payments through Stripe</p>
              </div>
              
              <StripeConfiguration 
                brandId={brands.find(b => b.code === selectedBrand)?.id || selectedBrand}
                brandName={brands.find(b => b.code === selectedBrand)?.name || selectedBrand}
              />
              
              <StripePaymentGenerator 
                brandId={brands.find(b => b.code === selectedBrand)?.id || selectedBrand}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
