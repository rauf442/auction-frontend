// frontend/src/components/consignments/CSVUpload.tsx
"use client"

import React, { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react'
import { importConsignmentsCSV } from '@/lib/consignments-api'
import type { Consignment } from '@/lib/consignments-api'

interface CSVUploadProps {
  onUploadComplete?: (importedCount: number) => void
  onClose?: () => void
  className?: string
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export default function CSVUpload({ onUploadComplete, onClose, className = '' }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [step, setStep] = useState<'upload' | 'importing' | 'complete'>('upload')
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        parseCSV(content)
      }
      reader.readAsText(selectedFile)
    }
  }

  const parseCSV = (content: string) => {
    try {
      const lines = content.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        setError('CSV file must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || ''
        })
        return row
      })

      setCsvData(data)
      setStep('importing')
      handleImport(data)
    } catch (err) {
      setError('Failed to parse CSV file')
    }
  }

  const handleImport = async (data: any[]) => {
    try {
      const result = await importConsignmentsCSV(data)
      setImportResult(result.results)
      setStep('complete')

      if (result.results.success > 0 && onUploadComplete) {
        onUploadComplete(result.results.success)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import consignments')
      setStep('upload')
    }
  }

  const downloadTemplate = () => {
    const template = [
      'client_email,specialist_id,online_valuation_reference,default_vendor_commission,status',
      'client@example.com,specialist1,REF001,20,active'
    ].join('\n')
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'consignments_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setFile(null)
    setCsvData([])
    setStep('upload')
    setError(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Import Consignments from CSV</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Upload a CSV file with consignment data. The file should include columns for client_email, specialist_id, online_valuation_reference, default_vendor_commission, and status. The client must already exist in the system.
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-gray-600">
                  Drag and drop your CSV file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-500 hover:text-blue-600 font-medium"
                  >
                    browse to upload
                  </button>
                </p>
                <p className="text-sm text-gray-500">CSV files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                <Download className="h-4 w-4" />
                <span>Download Template</span>
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Importing consignments...</p>
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600 mb-4">
              <CheckCircle className="h-6 w-6" />
              <h3 className="text-lg font-medium">Import Complete</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{importResult.success}</span> consignments imported successfully
              </p>
              {importResult.failed > 0 && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-red-600">{importResult.failed}</span> consignments failed to import
                </p>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Errors:</h4>
                <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-32 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">{error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                onClick={reset}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Import More
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 