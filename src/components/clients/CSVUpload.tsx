// frontend/src/components/clients/CSVUpload.tsx
"use client"

import React, { useState, useRef } from 'react'
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { validateClientCSV, uploadClientCSV, type Client } from '@/lib/clients-api'

interface CSVUploadProps {
  onImportComplete?: (clients: Client[]) => void
  onClose?: () => void
}

export default function CSVUpload({ onImportComplete, onClose }: CSVUploadProps) {
  const [csvData, setCsvData] = useState('')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [step, setStep] = useState<'upload' | 'validate' | 'import' | 'complete'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setCsvData(text)
        setStep('validate')
      }
      reader.readAsText(file)
    }
  }

  const handleValidate = async () => {
    if (!csvData) return

    try {
      setIsValidating(true)
      const result = await validateClientCSV(csvData)
      // Store only the validation_result payload expected by the UI below
      setValidationResult(result.validation_result)
      setStep('import')
    } catch (err: any) {
      console.error('Validation error:', err)
      setValidationResult({
        total_rows: 0,
        valid_rows: 0,
        errors: [err.message || 'Validation failed'],
        sample_clients: []
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleImport = async () => {
    if (!csvData) return

    try {
      setIsUploading(true)
      const result = await uploadClientCSV(csvData)
      setUploadResult(result)
      setStep('complete')
      
      // Call the completion callback with imported clients
      if (result.success && result.clients) {
        onImportComplete?.(result.clients)
      }
    } catch (err: any) {
      console.error('Import error:', err)
      setUploadResult({
        success: false,
        message: err.message || 'Import failed',
        errors: [err.message || 'Import failed']
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      'id,Full Name,brand,platform,email,phone_number,company_name,instagram_url,role,client_type,vat_number,tags,billing_country,billing_city,identity_cert,title,salutation,birth_date,preferred_language,time_zone,has_no_email,vat_applicable,secondary_email,secondary_phone_number,default_vat_scheme,default_ldl,default_consignment_charges,billing_address1,billing_address2,billing_address3,billing_post_code,billing_region,shipping_same_as_billing,shipping_address1,shipping_address2,shipping_address3,shipping_city,shipping_post_code,shipping_country,shipping_region,paddle_no',
      '1,Adnan Amjad,MSABER,Private,,92(321)2119000,,,,,,,,,,,,,,,,,,,,,"1723 Garrison Dr Frisco, Texas 75033-7358, United states",,,,,,,,,,,,',
      '2,Tarun Jain,MSABER,Private,,(917)7210426,,,,,,,,,,,,,,,,,,,,,"900 park ave suite-4E New york, new york 10075-0231 united states",,,,,,,,,,,,'
    ].join('\n')

    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'clients-sample.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const reset = () => {
    setCsvData('')
    setValidationResult(null)
    setUploadResult(null)
    setStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import Clients from CSV</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              {[
                { id: 'upload', label: 'Upload CSV', icon: Upload },
                { id: 'validate', label: 'Validate Data', icon: FileText },
                { id: 'import', label: 'Import Clients', icon: Download },
                { id: 'complete', label: 'Complete', icon: CheckCircle }
                              ].map((stepItem, index) => {
                 const isActive = stepItem.id === step
                 const isCompleted = ['upload', 'validate', 'import', 'complete'].indexOf(step) > index
                const Icon = stepItem.icon

                return (
                  <div key={stepItem.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-teal-500 text-white' : 
                      'bg-gray-200 text-gray-500'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`ml-2 text-sm ${
                      isActive ? 'text-teal-600 font-medium' : 
                      isCompleted ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {stepItem.label}
                    </span>
                    {index < 3 && (
                      <div className={`mx-4 h-0.5 w-8 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sample CSV Download */}
          {step === 'upload' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-800">CSV Format Requirements</h3>
              </div>
              <p className="text-blue-700 text-sm mb-3">
                Your CSV must follow this exact header order and include <strong>Full Name</strong> and required <strong>brand</strong> and <strong>platform</strong>:
                <br />
                <code className="break-words">id,Full Name,brand,platform,email,phone_number,company_name,instagram_url,role,client_type,vat_number,tags,billing_country,billing_city,identity_cert,title,salutation,birth_date,preferred_language,time_zone,has_no_email,vat_applicable,secondary_email,secondary_phone_number,default_vat_scheme,default_ldl,default_consignment_charges,billing_address1,billing_address2,billing_address3,billing_post_code,billing_region,shipping_same_as_billing,shipping_address1,shipping_address2,shipping_address3,shipping_city,shipping_post_code,shipping_country,shipping_region,paddle_no</code>
                <br />
                We will split <strong>Full Name</strong> into first and last name (first word → first_name, remaining words → last_name). Empty values are accepted.
              </p>
              <button
                onClick={downloadSampleCSV}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                <span>Download Sample CSV</span>
              </button>
            </div>
          )}

          {/* Step Content */}
          {step === 'upload' && (
            <div className="mt-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your CSV file</h3>
                <p className="text-gray-600 mb-4">
                  Select a CSV file containing client data to import
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Choose CSV File
                </button>
              </div>
            </div>
          )}

          {step === 'validate' && (
            <div className="mt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">CSV Data Preview</h3>
                <pre className="text-sm text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                  {csvData.split('\n').slice(0, 5).join('\n')}
                  {csvData.split('\n').length > 5 && '\n...'}
                </pre>
              </div>
              
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {isValidating ? 'Validating...' : 'Validate Data'}
                </button>
                <button
                  onClick={reset}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {step === 'import' && validationResult && (
            <div className="mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Validation Results</h3>
                <div className="text-sm text-blue-700">
                  <p>Total rows: {validationResult.total_rows}</p>
                  <p>Valid rows: {validationResult.valid_rows}</p>
                  {validationResult.errors.length > 0 && (
                    <p className="text-red-600">Errors: {validationResult.errors.length}</p>
                  )}
                </div>
              </div>

              {validationResult.sample_clients.length > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">Sample Valid Clients</h3>
                  <div className="space-y-2">
                    {validationResult.sample_clients.slice(0, 3).map((client: any, index: number) => (
                      <div key={index} className="text-sm text-green-700">
                        {client.first_name} {client.last_name} - {client.email || 'No email'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.errors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">Validation Errors</h3>
                  <div className="space-y-1">
                    {validationResult.errors.slice(0, 5).map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-700">• {error}</div>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <div className="text-sm text-red-600">... and {validationResult.errors.length - 5} more errors</div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleImport}
                  disabled={isUploading || validationResult.valid_rows === 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? 'Importing...' : `Import ${validationResult.valid_rows} Clients`}
                </button>
                <button
                  onClick={reset}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && uploadResult && (
            <div className="mt-6">
              {uploadResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-800">Import Successful!</h3>
                  </div>
                  <p className="text-green-700 mb-4">
                    Successfully imported {uploadResult.imported_count} clients.
                  </p>
                  
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-orange-800 mb-2">Warnings</h4>
                      <div className="space-y-1">
                        {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                          <div key={index} className="text-sm text-orange-700">• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-red-800">Import Failed</h3>
                  </div>
                  <p className="text-red-700">{uploadResult.error}</p>
                </div>
              )}

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={onClose}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={reset}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 