// frontend/src/app/brands/page.tsx
'use client'

import React from 'react'
import { Building2 } from 'lucide-react'
import BrandLogoManager from '@/components/brands/BrandLogoManager'

export default function BrandsPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
            <p className="text-gray-600">Manage brand logos and settings</p>
          </div>
        </div>
      </div>

      {/* Brand Logo Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <BrandLogoManager showAllBrands={true} />
        </div>
      </div>
    </div>
  )
}
