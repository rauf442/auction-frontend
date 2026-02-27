// frontend/src/components/items/CSVUpload.tsx
"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Eye } from 'lucide-react'
import { ArtworksAPI, Artwork, getPlatformCredentials } from '@/lib/items-api'
import { getAuctions } from '@/lib/auctions-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { Auction } from '@/lib/auctions-api'

interface CSVUploadProps {
  onUploadComplete?: (importedCount: number) => void
  onClose?: () => void
  className?: string
}

interface ValidationResult {
  total_rows: number
  valid_rows: number
  errors: string[]
  sample_items: Artwork[]
}

export default function CSVUpload({ onUploadComplete, onClose, className = '' }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<string>('')
  const [step, setStep] = useState<'upload' | 'validate' | 'preview' | 'importing' | 'complete'>('upload')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [platform, setPlatform] = useState<'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom'>('liveauctioneers')
  const [ftpLoading, setFtpLoading] = useState(false)
  const [ftpStatus, setFtpStatus] = useState<string | null>(null)
  const [selectedAuction, setSelectedAuction] = useState<number | null>(null)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)

  // Fetch auctions on component mount
  useEffect(() => {
    const fetchAuctions = async () => {
      setAuctionsLoading(true)
      try {
        const response = await getAuctions({
          status: 'all',
          limit: 1000 // Get all auctions for selection
        })
        setAuctions(response.auctions)
      } catch (error) {
        console.error('Failed to fetch auctions:', error)
      } finally {
        setAuctionsLoading(false)
      }
    }

    fetchAuctions()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setError(null)
      
      // Read file content
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCsvData(content)
        setStep('validate')
        validateCSV(content)
      }
      reader.readAsText(selectedFile)
    }
  }

  const validateCSV = async (data: string) => {
    try {
      const response = await ArtworksAPI.validateCSV(data, platform)
      if (response.success && response.validation_result) {
        // Ensure validation_result has proper array structure
        const validationResult = {
          total_rows: response.validation_result.total_rows || 0,
          valid_rows: response.validation_result.valid_rows || 0,
          errors: Array.isArray(response.validation_result.errors) ? response.validation_result.errors : [],
          sample_items: Array.isArray(response.validation_result.sample_items) ? response.validation_result.sample_items : []
        }
        setValidationResult(validationResult)
        setStep('preview')
      } else {
        setError(response.error || 'Validation failed')
        setStep('upload')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate CSV')
      setStep('upload')
    }
  }

  const handleImport = async () => {
    if (!csvData) return

    try {
      setStep('importing')
      setError(null)

      const response = await ArtworksAPI.uploadCSV(csvData, platform, undefined, {
        auction_id: selectedAuction || undefined
      })

      if (response.success) {
        setImportResult(response)
        setStep('complete')
        onUploadComplete?.(response.imported_count || 0)
      } else {
        setError(response.error || 'Import failed')
        setStep('preview')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV')
      setStep('preview')
    }
  }

  const downloadTemplate = async () => {
    await ArtworksAPI.downloadTemplate(platform)
  }

  const reset = () => {
    setFile(null)
    setCsvData('')
    setStep('upload')
    setValidationResult(null)
    setError(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import Items from CSV</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload a CSV file matching the selected platform’s template
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Platform & Template */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Choose platform</h3>
                      <p className="text-sm text-blue-700 mt-1">Template and validation will match your selection.</p>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as any)}
                        className="border border-blue-300 bg-white rounded px-2 py-1 text-sm"
                      >
                        <option value="liveauctioneers">LiveAuctioneers</option>
                        <option value="easy_live">Easy Live Auction</option>
                        <option value="invaluable">Invaluable</option>
                        <option value="the_saleroom">The Saleroom</option>
                      </select>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Template
                      </button>
                    </div>
                  </div>

                  {/* Auction Selection (Optional) */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add to Auction (Optional)
                    </label>
                    <SearchableSelect
                      value={selectedAuction}
                      options={auctions.map(auction => ({
                        value: auction.id,
                        label: `${auction.short_name} - ${auction.long_name}`,
                        description: `Settlement: ${new Date(auction.settlement_date).toLocaleDateString()}`
                      }))}
                      placeholder="Select auction to add items to..."
                      onChange={(value) => setSelectedAuction(value as number)}
                      isLoading={auctionsLoading}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If selected, imported items will be automatically added to this auction.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload your CSV file
              </h3>
              <p className="text-gray-600 mb-4">Select a CSV file with your item data</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose CSV File
              </button>
            </div>

            {/* CSV Requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">CSV Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {platform === 'liveauctioneers' && (
                  <>
                    <li>• Required: LotNum, Title, Description, LowEst, HighEst</li>
                    <li>• Optional: StartPrice, Condition, Reserve, Consignor, ImageFile.1-10</li>
                    <li>• LotNum ≤ 10 characters; Title ≤ 49 characters</li>
                  </>
                )}
                {platform !== 'liveauctioneers' && (
                  <>
                    <li>• Required columns vary by platform; use the template above</li>
                    <li>• Numbers should not include currency symbols or commas</li>
                  </>
                )}
                <li>• Estimates must be positive numbers</li>
                <li>• Image fields should contain valid URLs</li>
              </ul>
              {platform === 'liveauctioneers' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    Bulk image upload: You can upload images via FTP to LiveAuctioneers. Use the Platform Credentials page to save your FTP username/password, then use the button below.
                  </p>
                  <div className="mt-2">
                    <button
                      disabled={ftpLoading}
                      onClick={async () => {
                        try {
                          setFtpLoading(true)
                          setFtpStatus(null)
                          // Try to pull saved creds for current brand (defaults to 'MSABER')
                          const brand = localStorage.getItem('brand_code') || 'MSABER'
                          const creds = await getPlatformCredentials(brand, 'LIVE_AUCTIONEERS')
                          if (!creds?.key_id || !creds?.secret_value) {
                            setFtpStatus('Missing LiveAuctioneers FTP credentials in Settings → Platforms')
                            return
                          }
                          // This is a placeholder call; UI would select files or zip and send. Here we send nothing to illustrate flow.
                          const resp = await ArtworksAPI.uploadImagesViaFTP({
                            host: creds.additional?.host || 'ftp.liveauctioneers.com',
                            user: creds.key_id,
                            password: creds.secret_value,
                            secure: false,
                            base_dir: creds.additional?.base_dir || '/',
                            files: []
                          })
                          setFtpStatus(resp.success ? 'FTP connection OK. Ready to upload images.' : (resp.error || 'FTP error'))
                        } catch (e: any) {
                          setFtpStatus(e.message || 'FTP error')
                        } finally {
                          setFtpLoading(false)
                        }
                      }}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Test LiveAuctioneers FTP
                    </button>
                    {ftpStatus && <p className="text-xs text-blue-900 mt-2">{ftpStatus}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 'validate' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Validating CSV</h3>
              <p className="text-gray-600">
                Checking your file format and data...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && validationResult && (
          <div className="space-y-6">
            {/* Validation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Rows</p>
                    <p className="text-lg font-bold text-blue-600">{validationResult?.total_rows || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Valid Items</p>
                    <p className="text-lg font-bold text-green-600">{validationResult?.valid_rows || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Errors</p>
                    <p className="text-lg font-bold text-red-600">{(validationResult?.errors && Array.isArray(validationResult.errors)) ? validationResult.errors.length : 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {(validationResult.errors && Array.isArray(validationResult.errors) && validationResult.errors.length > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Validation Errors
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Sample Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Sample Items Preview
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3">Lot #</th>
                      <th className="text-left py-2 px-3">Title</th>
                      <th className="text-left py-2 px-3">Low Est</th>
                      <th className="text-left py-2 px-3">High Est</th>
                      <th className="text-left py-2 px-3">Start Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(validationResult.sample_items && Array.isArray(validationResult.sample_items) ? validationResult.sample_items.slice(0, 3) : []).map((item, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2 px-3">{item.id}</td>
                        <td className="py-2 px-3">{item.title}</td>
                        <td className="py-2 px-3">£{item.low_est}</td>
                        <td className="py-2 px-3">£{item.high_est}</td>
                        <td className="py-2 px-3">£{item.start_price || 'Auto'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(validationResult.sample_items && Array.isArray(validationResult.sample_items) && validationResult.sample_items.length > 3) && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... and {validationResult.sample_items.length - 3} more items
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={reset}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Choose Different File
              </button>
              
              <div className="space-x-3">
                {((validationResult?.errors && Array.isArray(validationResult.errors) && validationResult.errors.length > 0)) && (
                  <span className="text-sm text-red-600">
                    Fix errors before importing
                  </span>
                )}
                <button
                  onClick={handleImport}
                  disabled={(validationResult?.valid_rows || 0) === 0 || (validationResult?.errors && Array.isArray(validationResult.errors) && validationResult.errors.length > 0)}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import {validationResult?.valid_rows || 0} Items
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Items</h3>
              <p className="text-gray-600">
                Adding items to your inventory...
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResult && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Import Successful!
            </h3>
            <p className="text-gray-600 mb-4">
              Successfully imported {importResult.imported_count} items
            </p>

            {/* Auto-sync Results */}
            {importResult.auto_sync && (
              <div className={`mt-4 p-4 rounded-lg border ${
                importResult.auto_sync.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  {importResult.auto_sync.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  )}
                  <h4 className={`font-medium ${
                    importResult.auto_sync.success ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    Google Sheets Auto-Sync
                  </h4>
                </div>
                <p className={`text-sm ${
                  importResult.auto_sync.success ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {importResult.auto_sync.success
                    ? `✅ Synced ${importResult.auto_sync.synced_count || 0} items to Google Sheets`
                    : `⚠️ Auto-sync failed: ${importResult.auto_sync.message || 'Unknown error'}`
                  }
                </p>
              </div>
            )}

            <div className="space-x-3 mt-6">
              <button
                onClick={reset}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Import Another File
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 