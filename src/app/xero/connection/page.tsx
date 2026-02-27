// frontend/admin/src/app/xero/connection/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, HelpCircle } from 'lucide-react'
import BrandSelector from '@/components/xero/BrandSelector'
import XeroConnectButton from '@/components/ui/XeroConnectButton'
import { getBrands } from '@/lib/brands-api'

interface Brand {
  id: number
  name: string
  code: string
}

export default function XeroConnectionPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [showHelp, setShowHelp] = useState(false)

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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="h-6 w-6 text-blue-600" />
              Xero Connection
            </h1>
            <p className="text-gray-600 mt-1">Connect your brands to Xero for accounting integration</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-500 hover:text-gray-700"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Setup Help
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Brand Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandSelector
              selectedBrandId={selectedBrandId}
              onBrandSelect={setSelectedBrandId}
            />
          </CardContent>
        </Card>

        {/* Xero Connection */}
        {selectedBrandId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Xero Integration</CardTitle>
            </CardHeader>
            <CardContent>
              {brands.find(b => b.id.toString() === selectedBrandId)?.code ? (
                <XeroConnectButton
                  brandId={selectedBrandId}
                  brandName={brands.find(b => b.id.toString() === selectedBrandId)?.name || ''}
                  selectedBrand={brands.find(b => b.id.toString() === selectedBrandId)?.code || ''}
                  variant="default"
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Please select a valid brand to configure Xero integration.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Collapsible Setup Help */}
        {showHelp && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-900">Quick Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">1. Create Xero App</h4>
                  <p className="text-blue-700 mb-2">
                    Visit{' '}
                    <a
                      href="https://developer.xero.com/myapps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Xero Developer Portal
                    </a>
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-blue-900 mb-2">2. Redirect URI</h4>
                  <code className="block p-2 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                    {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/xero-payments/callback
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-blue-900 mb-2">3. Required Scopes</h4>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• accounting.transactions</li>
                    <li>• accounting.contacts</li>
                    <li>• accounting.settings</li>
                    <li>• offline_access</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-blue-900 mb-2">4. Connect</h4>
                  <p className="text-blue-700 text-xs">
                    Select your brand above and click "Connect to Xero"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
