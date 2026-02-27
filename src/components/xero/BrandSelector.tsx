// frontend/admin/src/components/xero/BrandSelector.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBrands, Brand } from '@/lib/brands-api'
import { Building2, ChevronDown, Check } from 'lucide-react'

interface BrandSelectorProps {
  selectedBrandId: string | null
  onBrandSelect: (brandId: string) => void
  className?: string
}

export default function BrandSelector({ selectedBrandId, onBrandSelect, className }: BrandSelectorProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await getBrands()
      if (response.success) {
        const activeBrands = response.data.filter(brand => brand.is_active)
        setBrands(activeBrands)
        
        // Auto-select first brand if none selected
        if (!selectedBrandId && activeBrands.length > 0) {
          onBrandSelect(activeBrands[0].id.toString())
        }
      } else {
        setError(response.message || 'Failed to fetch brands')
      }
    } catch (err) {
      setError('Error loading brands')
      console.error('Error fetching brands:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedBrand = brands.find(brand => brand.id.toString() === selectedBrandId)

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-gray-500">Loading brands...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Select Brand for Xero Integration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <div className="flex items-center space-x-3">
              {selectedBrand ? (
                <>
                  {selectedBrand.logo_url && (
                    <img 
                      src={selectedBrand.logo_url} 
                      alt={selectedBrand.name}
                      className="h-8 w-8 object-contain rounded"
                    />
                  )}
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{selectedBrand.name}</div>
                    <div className="text-sm text-gray-500">{selectedBrand.code}</div>
                  </div>
                </>
              ) : (
                <div className="text-gray-500">Select a brand</div>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => {
                    onBrandSelect(brand.id.toString())
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    {brand.logo_url && (
                      <img 
                        src={brand.logo_url} 
                        alt={brand.name}
                        className="h-8 w-8 object-contain rounded"
                      />
                    )}
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{brand.name}</div>
                      <div className="text-sm text-gray-500">{brand.code}</div>
                    </div>
                  </div>
                  {selectedBrandId === brand.id.toString() && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedBrand && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Brand Information</h4>
            <div className="space-y-1 text-sm text-blue-800">
              {selectedBrand.website_url && (
                <div>Website: <span className="font-mono">{selectedBrand.website_url}</span></div>
              )}
              {selectedBrand.contact_email && (
                <div>Email: <span className="font-mono">{selectedBrand.contact_email}</span></div>
              )}
              {selectedBrand.vat_number && (
                <div>VAT Number: <span className="font-mono">{selectedBrand.vat_number}</span></div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
