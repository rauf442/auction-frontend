// frontend/src/components/ExportShareModal.tsx
'use client'

import React, { useState } from 'react'
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  FileText, 
  Settings,
  Copy,
  Mail,
  MessageSquare,
  Check
} from 'lucide-react'

interface ExportField {
  key: string
  label: string
  selected: boolean
  required?: boolean
}

interface ExportShareModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  data: any
  availableFields: ExportField[]
  onExport: (format: 'pdf' | 'csv' | 'json', selectedFields: string[]) => Promise<void>
  onPrint: (selectedFields: string[]) => void
  onShare: (method: 'link' | 'email' | 'copy', selectedFields: string[]) => void
  userRole?: string
}

export default function ExportShareModal({
  isOpen,
  onClose,
  title,
  data,
  availableFields,
  onExport,
  onPrint,
  onShare,
  userRole = 'user'
}: ExportShareModalProps) {
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(
    availableFields.map(field => ({ ...field }))
  )
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'copy'>('copy')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'export' | 'share' | 'print'>('export')

  // Only show this modal to super_admins
  if (userRole !== 'super_admin') {
    return null
  }

  if (!isOpen) return null

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.map(field => 
        field.key === fieldKey 
          ? { ...field, selected: !field.selected }
          : field
      )
    )
  }

  const getSelectedFieldKeys = () => {
    return selectedFields.filter(field => field.selected).map(field => field.key)
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      await onExport(exportFormat, getSelectedFieldKeys())
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    onPrint(getSelectedFieldKeys())
    onClose()
  }

  const handleShare = async () => {
    setLoading(true)
    try {
      await onShare(shareMethod, getSelectedFieldKeys())
      if (shareMethod === 'copy') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Share failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectAll = () => {
    setSelectedFields(prev => prev.map(field => ({ ...field, selected: true })))
  }

  const selectNone = () => {
    setSelectedFields(prev => 
      prev.map(field => ({ 
        ...field, 
        selected: field.required || false 
      }))
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Export & Share: {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'export'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Download className="h-4 w-4 inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'print'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Printer className="h-4 w-4 inline mr-2" />
            Print
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'share'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Share2 className="h-4 w-4 inline mr-2" />
            Share
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Field Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Customize Fields
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={selectNone}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  Select None
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {selectedFields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={field.selected}
                    onChange={() => !field.required && handleFieldToggle(field.key)}
                    disabled={field.required}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <span className={`${field.required ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Export Format</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'pdf', label: 'PDF Document', icon: FileText },
                  { value: 'csv', label: 'CSV Spreadsheet', icon: Download },
                  { value: 'json', label: 'JSON Data', icon: Download }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setExportFormat(value as any)}
                    className={`p-3 border rounded-lg text-sm font-medium flex flex-col items-center space-y-2 ${
                      exportFormat === value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Share Method</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'copy', label: 'Copy Link', icon: Copy },
                  { value: 'email', label: 'Email', icon: Mail },
                  { value: 'link', label: 'Generate Link', icon: Share2 }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setShareMethod(value as any)}
                    className={`p-3 border rounded-lg text-sm font-medium flex flex-col items-center space-y-2 ${
                      shareMethod === value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'print' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Print Options</h4>
              <p className="text-sm text-gray-600">
                Print the selected fields with professional formatting.
                Your browser's print dialog will open with optimized settings.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {getSelectedFieldKeys().length} field(s) selected
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            
            {activeTab === 'export' && (
              <button
                onClick={handleExport}
                disabled={loading || getSelectedFieldKeys().length === 0}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export {exportFormat.toUpperCase()}
              </button>
            )}
            
            {activeTab === 'print' && (
              <button
                onClick={handlePrint}
                disabled={getSelectedFieldKeys().length === 0}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
            )}
            
            {activeTab === 'share' && (
              <button
                onClick={handleShare}
                disabled={loading || getSelectedFieldKeys().length === 0}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied!' : 'Share'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
