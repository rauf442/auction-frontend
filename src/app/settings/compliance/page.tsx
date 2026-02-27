// frontend/src/app/settings/compliance/page.tsx
'use client'

import React from 'react'
import { Shield } from 'lucide-react'
import BrandComplianceManager from '@/components/compliance/BrandComplianceManager'

export default function SettingsCompliancePage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance & Brand Settings</h1>
            <p className="text-gray-600">Manage brand compliance settings, legal documents, and business information</p>
          </div>
        </div>
      </div>

      {/* Brand Compliance Management */}
      <BrandComplianceManager showAllBrands={true} />
    </div>
  )
}
