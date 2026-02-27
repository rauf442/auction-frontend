// frontend/src/components/brands/BrandLogoManager.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  Check,
  X,
  AlertTriangle
} from 'lucide-react'

interface Brand {
  id: number
  code: string
  name: string
  logo_url?: string
  logo_file_name?: string
  logo_file_size?: number
  logo_uploaded_at?: string
  has_logo?: boolean
  logo_status?: 'uploaded' | 'no_logo'
}

interface BrandLogoManagerProps {
  brandId?: number
  onLogoUpdated?: (logoUrl: string | null) => void
  showAllBrands?: boolean
  className?: string
}

export default function BrandLogoManager({ 
  brandId, 
  onLogoUpdated, 
  showAllBrands = false,
  className = ''
}: BrandLogoManagerProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAllBrands) {
      loadAllBrands()
    } else if (brandId) {
      loadBrandLogo(brandId)
    }
  }, [brandId, showAllBrands])

  const loadAllBrands = async () => {
    try {
      setLoading(true)
      setError(null)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : 'http://localhost:3001/api';
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/brand-logos`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch brands')
      }

      const data = await response.json()
      setBrands(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadBrandLogo = async (id: number) => {
    try {
      setLoading(true)
      setError(null)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : 'http://localhost:3001/api';
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/brand-logos/${id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch brand logo')
      }

      const data = await response.json()
      setSelectedBrand(data.data)
      setBrands([data.data])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, brand: Brand) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUpload(file, brand)
    }
  }

  const handleUpload = async (file: File, brand: Brand) => {
    try {
      setUploading(true)
      setError(null)

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      const formData = new FormData()
      formData.append('logo', file)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : 'http://localhost:3001/api';
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/brand-logos/${brand.id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload logo')
      }

      const data = await response.json()
      
      // Update brand in the list
      setBrands(prev => prev.map(b => 
        b.id === brand.id 
          ? { ...b, logo_url: data.data.logo_url, has_logo: true, logo_status: 'uploaded' as const }
          : b
      ))

      if (onLogoUpdated) {
        onLogoUpdated(data.data.logo_url)
      }

      // Refresh data
      if (showAllBrands) {
        loadAllBrands()
      } else {
        loadBrandLogo(brand.id)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete the logo for ${brand.name}?`)) {
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : 'http://localhost:3001/api';
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/brand-logos/${brand.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete logo')
      }

      // Update brand in the list
      setBrands(prev => prev.map(b => 
        b.id === brand.id 
          ? { ...b, logo_url: undefined, has_logo: false, logo_status: 'no_logo' as const }
          : b
      ))

      if (onLogoUpdated) {
        onLogoUpdated(null)
      }

      // Refresh data
      if (showAllBrands) {
        loadAllBrands()
      } else {
        loadBrandLogo(brand.id)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading brand logos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showAllBrands ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Logo Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <BrandLogoCard
                key={brand.id}
                brand={brand}
                uploading={uploading}
                deleting={deleting}
                onUpload={(file) => handleUpload(file, brand)}
                onDelete={() => handleDelete(brand)}
                onPreview={() => {
                  setSelectedBrand(brand)
                  setPreviewOpen(true)
                }}
                fileInputRef={fileInputRef}
              />
            ))}
          </div>
        </div>
      ) : selectedBrand ? (
        <BrandLogoCard
          brand={selectedBrand}
          uploading={uploading}
          deleting={deleting}
          onUpload={(file) => handleUpload(file, selectedBrand)}
          onDelete={() => handleDelete(selectedBrand)}
          onPreview={() => setPreviewOpen(true)}
          fileInputRef={fileInputRef}
          showDetails
        />
      ) : (
        <div className="text-center text-gray-500">No brand selected</div>
      )}

      {/* Preview Modal */}
      {previewOpen && selectedBrand?.logo_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{selectedBrand.name} Logo</h4>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={selectedBrand.logo_url}
              alt={`${selectedBrand.name} logo`}
              className="max-w-full max-h-96 object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface BrandLogoCardProps {
  brand: Brand
  uploading: boolean
  deleting: boolean
  onUpload: (file: File) => void
  onDelete: () => void
  onPreview: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  showDetails?: boolean
}

function BrandLogoCard({
  brand,
  uploading,
  deleting,
  onUpload,
  onDelete,
  onPreview,
  fileInputRef,
  showDetails = false
}: BrandLogoCardProps) {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{brand.name}</h4>
          <p className="text-sm text-gray-500">Code: {brand.code}</p>
        </div>
        {brand.has_logo && (
          <div className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" />
            <span className="text-xs">Logo uploaded</span>
          </div>
        )}
      </div>

      {brand.logo_url ? (
        <div className="space-y-4">
          <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src={brand.logo_url}
              alt={`${brand.name} logo`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {showDetails && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>File: {brand.logo_file_name}</p>
              <p>Size: {formatFileSize(brand.logo_file_size)}</p>
              {brand.logo_uploaded_at && (
                <p>Uploaded: {new Date(brand.logo_uploaded_at).toLocaleDateString()}</p>
              )}
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={onPreview}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No logo uploaded</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {brand.logo_url ? 'Replace Logo' : 'Upload Logo'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function formatFileSize(bytes?: number) {
  if (!bytes) return 'Unknown'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}
