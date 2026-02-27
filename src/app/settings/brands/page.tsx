// frontend/src/app/settings/brands/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { Save, Edit3, X, Check, Settings, Globe, Building, Database, Camera, ExternalLink } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Brand Display Card Component
function BrandDisplayCard({ brand, onEdit, onImageUpload, uploadingImage }: any) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImageUpload(brand.id, file)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Logo and Basic Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {/* Brand Logo */}
          <div className="relative">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={`${brand.name} logo`}
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
            )}

            {/* Upload Button Overlay */}
            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingImage === brand.id}
              />
              {uploadingImage === brand.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </label>
          </div>

          {/* Brand Info */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{brand.name}</h4>
            <p className="text-sm text-gray-500 font-mono">{brand.code}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
            brand.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {brand.is_active ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit brand details"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Brand Edit Form Component
function BrandEditForm({ brand, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: brand.name || '',
    code: brand.code || '',
    is_active: brand.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(brand.id, formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Edit Brand</h4>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Code *</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => handleChange('is_active', e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Active brand
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  )
}

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isPublicAuctions, setIsPublicAuctions] = useState<boolean>(false)
  const [isPublicItems, setIsPublicItems] = useState<boolean>(false)
  const [isPublicRefunds, setIsPublicRefunds] = useState<boolean>(false)
  const [isPublicReimbursements, setIsPublicReimbursements] = useState<boolean>(false)
  const [isPublicBanking, setIsPublicBanking] = useState<boolean>(false)
  const [globalGoogleSheets, setGlobalGoogleSheets] = useState({
    clients: '',
    consignments: '',
    artworks: '',
    auctions: ''
  })
  const [editingSheet, setEditingSheet] = useState<string | null>(null)
  const [tempUrl, setTempUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingBrand, setEditingBrand] = useState<number | null>(null)
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const authedFetch = (path: string, init?: RequestInit): Promise<Response> => 
    fetch(`${API_BASE_URL}${path}`, { 
      ...(init || {}), 
      headers: { 
        ...(init?.headers || {}), 
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      } 
    })

  const loadBrands = async () => {
    try {
      const res = await authedFetch('/api/brands')
      const data = await res.json()
      if (data.success) {
        setBrands(data.data)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const loadGlobalGoogleSheets = async () => {
    try {
      const res = await authedFetch('/api/app-settings/google-sheets')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setGlobalGoogleSheets({
            clients: data.data.clients || '',
            consignments: data.data.consignments || '',
            artworks: data.data.artworks || '',
            auctions: data.data.auctions || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading global Google Sheets URLs:', error)
    }
  }

  const saveGlobalGoogleSheetUrl = async (module: string, url: string) => {
    try {
      const res = await authedFetch('/api/app-settings/google-sheets', {
        method: 'POST',
        body: JSON.stringify({
          module,
          url
        })
      })
      
      if (res.ok) {
        setGlobalGoogleSheets(prev => ({
          ...prev,
          [module]: url
        }))
        setEditingSheet(null)
        setTempUrl('')
        // Show success feedback
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        successDiv.textContent = `✓ ${module} URL saved successfully!`
        document.body.appendChild(successDiv)
        setTimeout(() => document.body.removeChild(successDiv), 3000)
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save Google Sheets URL')
      }
    } catch (error: any) {
      console.error('Error saving Google Sheets URL:', error)
      alert(`Error: ${error.message}`)
    }
  }
  
  const loadVisibility = async () => {
    const modules: Array<[string, (v:boolean)=>void]> = [
      ['auctions', setIsPublicAuctions],
      ['items', setIsPublicItems],
      ['refunds', setIsPublicRefunds],
      ['reimbursements', setIsPublicReimbursements],
      ['banking', setIsPublicBanking],
    ]
    await Promise.all(modules.map(async ([m,setter]) => {
      const res = await authedFetch(`/api/brands/visibility/${m}`)
      if (res.ok) { 
        const data = await res.json()
        setter(!!data.data.is_public) 
      }
    }))
  }

  useEffect(() => { 
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadBrands(), loadVisibility(), loadGlobalGoogleSheets()])
      setLoading(false)
    }
    loadData()
  }, [])

  const createBrand = async () => {
    if (!code.trim() || !name.trim()) {
      alert('Please enter both code and name')
      return
    }
    
    try {
      const res = await authedFetch('/api/brands', { 
        method: 'POST', 
        body: JSON.stringify({ code: code.trim().toUpperCase(), name: name.trim(), is_active: true }) 
      })
      
      if (res.ok) {
        setCode('')
        setName('')
        await loadBrands()
        // Show success feedback
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        successDiv.textContent = `✓ Brand "${name}" created successfully!`
        document.body.appendChild(successDiv)
        setTimeout(() => document.body.removeChild(successDiv), 3000)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create brand')
      }
    } catch (error) {
      console.error('Error creating brand:', error)
      alert('Failed to create brand')
    }
  }

  const saveVisibility = async (module: string, value: boolean) => {
    try {
      const res = await authedFetch('/api/brands/visibility', { 
        method: 'POST', 
        body: JSON.stringify({ module, is_public: value }) 
      })
      
      if (res.ok) {
        switch(module){
          case 'auctions': setIsPublicAuctions(value); break;
          case 'items': setIsPublicItems(value); break;
          case 'refunds': setIsPublicRefunds(value); break;
          case 'reimbursements': setIsPublicReimbursements(value); break;
          case 'banking': setIsPublicBanking(value); break;
        }
      }
    } catch (error) {
      console.error('Error saving visibility:', error)
    }
  }

  const openGoogleSheetUrl = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank')
    }
  }

  const handleImageUpload = async (brandId: number, file: File) => {
    try {
      setUploadingImage(brandId)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('brand_id', brandId.toString())

      const response = await fetch(`${API_BASE_URL}/brand-logos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        // Update the brand in the local state
        setBrands(prevBrands => 
          prevBrands.map(brand => 
            brand.id === brandId 
              ? { ...brand, logo_url: result.logo_url }
              : brand
          )
        )
        // Show success feedback
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        successDiv.textContent = '✓ Brand logo uploaded successfully!'
        document.body.appendChild(successDiv)
        setTimeout(() => document.body.removeChild(successDiv), 3000)
      } else {
        throw new Error('Failed to upload image')
      }
    } catch (error: any) {
      console.error('Error uploading image:', error)
      alert(`Error uploading image: ${error.message}`)
    } finally {
      setUploadingImage(null)
    }
  }

  const updateBrandDetails = async (brandId: number, updates: any) => {
    try {
      console.log('🔧 Frontend: Updating brand', { brandId, updates, token });
      console.log('🔧 Frontend: Auth header will be:', `Bearer ${token}`);

      const response = await authedFetch(`/api/brands/${brandId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      console.log('🔧 Frontend: Response status', response.status);
      console.log('🔧 Frontend: Response headers', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        console.log('🔧 Frontend: Response is OK, parsing JSON...');
        const result = await response.json()
        // Update the brand in the local state
        setBrands(prevBrands => 
          prevBrands.map(brand => 
            brand.id === brandId 
              ? { ...brand, ...updates }
              : brand
          )
        )
        setEditingBrand(null)
        // Show success feedback
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        successDiv.textContent = '✓ Brand updated successfully!'
        document.body.appendChild(successDiv)
        setTimeout(() => document.body.removeChild(successDiv), 3000)
      } else {
        console.log('🔧 Frontend: Response is NOT OK, getting error text...');
        const errorText = await response.text();
        console.log('🔧 Frontend: Error response:', errorText);
        throw new Error(`Failed to update brand (${response.status}): ${errorText}`)
      }
    } catch (error: any) {
      console.error('Error updating brand:', error)
      alert(`Error updating brand: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Brand & System Settings</h1>
              <p className="text-gray-600 mt-1">Manage brands, visibility settings, and global configurations</p>
            </div>
          </div>
        </div>

        {/* Global Google Sheets Integration */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Google Sheets Integration</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Configure global Google Sheets URLs for seamless data synchronization across all modules and brands.
            These URLs will be used for import, export, and real-time sync operations.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { key: 'clients', label: 'Clients', icon: '👥', description: 'Client data import/export' },
              { key: 'consignments', label: 'Consignments', icon: '📋', description: 'Consignment tracking' },
              { key: 'artworks', label: 'Artworks', icon: '🎨', description: 'Artwork inventory' },
              { key: 'auctions', label: 'Auctions', icon: '🏛️', description: 'Auction management' }
            ].map((module) => (
              <div key={module.key} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{module.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{module.label}</h3>
                      <p className="text-sm text-gray-500">{module.description}</p>
                    </div>
                  </div>
                  
                  {globalGoogleSheets[module.key as keyof typeof globalGoogleSheets] && (
                    <button
                      onClick={() => openGoogleSheetUrl(globalGoogleSheets[module.key as keyof typeof globalGoogleSheets])}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open Google Sheet"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {editingSheet === module.key ? (
                  <div className="space-y-3">
                    <input
                      type="url"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveGlobalGoogleSheetUrl(module.key, tempUrl)}
                        className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingSheet(null)
                          setTempUrl('')
                        }}
                        className="flex items-center space-x-1 bg-gray-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                        value={globalGoogleSheets[module.key as keyof typeof globalGoogleSheets] || 'No URL configured'}
                        readOnly
                      />
                      <button
                        onClick={() => {
                          setEditingSheet(module.key)
                          setTempUrl(globalGoogleSheets[module.key as keyof typeof globalGoogleSheets] || '')
                        }}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      💡 Use Google Sheets CSV export URL for automatic synchronization
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Global Visibility Settings */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Cross-Brand Visibility</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Configure which modules should be visible across all brands. When enabled, users can see data from all brands instead of just their assigned brand.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'auctions', label: 'Auctions', checked: isPublicAuctions, setter: setIsPublicAuctions, icon: '🏛️' },
              { key: 'items', label: 'Items/Artworks', checked: isPublicItems, setter: setIsPublicItems, icon: '🎨' },
              { key: 'refunds', label: 'Refunds', checked: isPublicRefunds, setter: setIsPublicRefunds, icon: '💰' },
              { key: 'reimbursements', label: 'Reimbursements', checked: isPublicReimbursements, setter: setIsPublicReimbursements, icon: '🧾' },
              { key: 'banking', label: 'Banking', checked: isPublicBanking, setter: setIsPublicBanking, icon: '🏦' }
            ].map((module) => (
              <div key={module.key} className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <span className="text-2xl">{module.icon}</span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{module.label}</span>
                    <div className="text-sm text-gray-500">
                      {module.checked ? 'Visible across all brands' : 'Brand-specific only'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={module.checked}
                    onChange={(e) => saveVisibility(module.key, e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Management */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Building className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Brand Management</h2>
          </div>

          {/* Create New Brand */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Create New Brand</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input 
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Brand Code (e.g., AURUM)" 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())} 
              />
              <input 
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Brand Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
              <button 
                onClick={createBrand}
                disabled={!code.trim() || !name.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Create Brand</span>
              </button>
            </div>
          </div>

          {/* Existing Brands */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Existing Brands</h3>
            {brands.length === 0 ? (
              <p className="text-gray-500 py-4">No brands found. Create your first brand above.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {brands.map((brand) => (
                  <div key={brand.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                    {editingBrand === brand.id ? (
                      <BrandEditForm 
                        brand={brand} 
                        onSave={updateBrandDetails}
                        onCancel={() => setEditingBrand(null)}
                      />
                    ) : (
                      <BrandDisplayCard 
                        brand={brand}
                        onEdit={() => setEditingBrand(brand.id)}
                        onImageUpload={handleImageUpload}
                        uploadingImage={uploadingImage}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


