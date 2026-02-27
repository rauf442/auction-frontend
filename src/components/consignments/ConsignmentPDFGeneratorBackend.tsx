// frontend/src/components/consignments/ConsignmentPDFGeneratorBackend.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Share2, Printer, Eye, Settings, FileText, Check, Users } from 'lucide-react'
import { isSuperAdmin } from '@/lib/auth-utils'
import { useConsignmentPDF, PDFCustomization } from '@/lib/consignment-pdf-api'
import type { Consignment } from '@/lib/consignments-api'

interface ConsignmentPDFGeneratorProps {
  selectedConsignments: any[]
  onClose: () => void
}

const defaultCustomization: PDFCustomization = {
  includeHeader: true,
  includeFooter: true,
  includeLogo: true,
  includeClientDetails: true,
  includeItemDetails: true,
  includeSpecialistInfo: true,
  includeSignatures: false,
  includeTermsConditions: true,
  headerText: 'Consignment Report',
  footerText: 'Confidential - For Internal Use Only',
  documentTitle: 'Consignment Summary',
  customNotes: '',
  fontSize: 'medium',
  orientation: 'portrait',
  paperSize: 'A4',
  margin: 'medium',
  branding: 'standard'
}

export default function ConsignmentPDFGeneratorBackend({ selectedConsignments, onClose }: ConsignmentPDFGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<'select-type' | 'customize' | 'generating' | 'complete'>('select-type')
  const [selectedTemplate, setSelectedTemplate] = useState<'summary' | 'detailed' | 'financial' | 'custom'>('summary')
  const [customization, setCustomization] = useState<PDFCustomization>(defaultCustomization)
  const [userIsSuperAdmin, setUserIsSuperAdmin] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const { generatePDF, isGenerating, error, clearError } = useConsignmentPDF()

  useEffect(() => {
    setUserIsSuperAdmin(isSuperAdmin())
  }, [])

  const documentTypes = [
    {
      id: 'summary',
      title: 'Summary Report',
      description: 'Basic consignment overview with client and item counts',
      icon: <FileText className="h-8 w-8" />
    },
    {
      id: 'detailed',
      title: 'Detailed Report',
      description: 'Complete consignment details with full item listings',
      icon: <Eye className="h-8 w-8" />
    },
    {
      id: 'financial',
      title: 'Financial Report',
      description: 'Financial breakdown with estimates and commission details',
      icon: <Users className="h-8 w-8" />
    },
    {
      id: 'custom',
      title: 'Custom Template',
      description: 'Fully customizable template (Super Admin only)',
      icon: <Settings className="h-8 w-8" />,
      superAdminOnly: true
    }
  ]

  const handleTemplateSelect = (templateId: 'summary' | 'detailed' | 'financial' | 'custom') => {
    setSelectedTemplate(templateId)
    if (templateId === 'custom' || userIsSuperAdmin) {
      setCurrentStep('customize')
    } else {
      // For non-super admin users, generate PDF directly with default settings
      handleGeneratePDF(templateId)
    }
  }

  const handleCustomizationChange = (field: keyof PDFCustomization, value: any) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGeneratePDF = async (template?: string) => {
    setCurrentStep('generating')
    clearError()

    try {
      const pdfData = {
        consignments: selectedConsignments,
        template: template || selectedTemplate,
        customization: userIsSuperAdmin ? customization : defaultCustomization,
        options: {
          userRole: userIsSuperAdmin ? 'super_admin' : 'user',
          brandCode: 'MSABER' // You can make this configurable
        }
      }

      await generatePDF('custom', pdfData, false)
      setCurrentStep('complete')

    } catch (error: any) {
      console.error('PDF generation error:', error)
      setCurrentStep('select-type')
    }
  }

  const handlePreview = async () => {
    try {
      const pdfData = {
        consignments: selectedConsignments,
        template: selectedTemplate,
        customization: userIsSuperAdmin ? customization : defaultCustomization,
        options: {
          userRole: userIsSuperAdmin ? 'super_admin' : 'user',
          brandCode: 'MSABER'
        }
      }

      await generatePDF('custom', pdfData, true)
    } catch (error: any) {
      console.error('PDF preview error:', error)
    }
  }

  const handleDownload = async () => {
    try {
      const pdfData = {
        consignments: selectedConsignments,
        template: selectedTemplate,
        customization: userIsSuperAdmin ? customization : defaultCustomization,
        options: {
          userRole: userIsSuperAdmin ? 'super_admin' : 'user',
          brandCode: 'MSABER'
        }
      }

      await generatePDF('custom', pdfData, false)
    } catch (error: any) {
      console.error('PDF download error:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Generate Consignment Report</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedConsignments.length} consignment(s) selected
              {userIsSuperAdmin && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Super Admin
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error generating PDF</h3>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'select-type' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Report Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTemplateSelect(type.id as any)}
                    disabled={type.superAdminOnly && !userIsSuperAdmin}
                    className={`p-6 border-2 rounded-lg text-left transition-all ${
                      type.superAdminOnly && !userIsSuperAdmin
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`${type.superAdminOnly && !userIsSuperAdmin ? 'text-gray-400' : 'text-blue-600'}`}>
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {type.title}
                          {type.superAdminOnly && (
                            <span className="ml-2 text-xs text-purple-600">(Super Admin Only)</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'customize' && userIsSuperAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Customize Report</h3>
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Content Options</h4>
                  
                  {[
                    { key: 'includeHeader', label: 'Include Header' },
                    { key: 'includeFooter', label: 'Include Footer' },
                    { key: 'includeLogo', label: 'Include Company Logo' },
                    { key: 'includeClientDetails', label: 'Include Client Details' },
                    { key: 'includeItemDetails', label: 'Include Item Details' },
                    { key: 'includeSpecialistInfo', label: 'Include Specialist Info' },
                    { key: 'includeSignatures', label: 'Include Signature Lines' },
                    { key: 'includeTermsConditions', label: 'Include Terms & Conditions' }
                  ].map((option) => (
                    <label key={option.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customization[option.key as keyof PDFCustomization] as boolean}
                        onChange={(e) => handleCustomizationChange(option.key as keyof PDFCustomization, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>

                {/* Text Customization */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Text Customization</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                    <input
                      type="text"
                      value={customization.documentTitle}
                      onChange={(e) => handleCustomizationChange('documentTitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Header Text</label>
                    <input
                      type="text"
                      value={customization.headerText}
                      onChange={(e) => handleCustomizationChange('headerText', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                    <input
                      type="text"
                      value={customization.footerText}
                      onChange={(e) => handleCustomizationChange('footerText', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Notes</label>
                    <textarea
                      rows={3}
                      value={customization.customNotes}
                      onChange={(e) => handleCustomizationChange('customNotes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes to include in the report..."
                    />
                  </div>
                </div>

                {/* Advanced Options */}
                {showAdvancedOptions && (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Layout Options</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <select
                          value={customization.fontSize}
                          onChange={(e) => handleCustomizationChange('fontSize', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
                        <select
                          value={customization.orientation}
                          onChange={(e) => handleCustomizationChange('orientation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
                        <select
                          value={customization.paperSize}
                          onChange={(e) => handleCustomizationChange('paperSize', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="A4">A4</option>
                          <option value="A3">A3</option>
                          <option value="Letter">Letter</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Style Options</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Margin Size</label>
                        <select
                          value={customization.margin}
                          onChange={(e) => handleCustomizationChange('margin', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branding Level</label>
                        <select
                          value={customization.branding}
                          onChange={(e) => handleCustomizationChange('branding', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="minimal">Minimal</option>
                          <option value="standard">Standard</option>
                          <option value="full">Full Branding</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep('select-type')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={handlePreview}
                  disabled={isGenerating}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </button>
                <button
                  onClick={() => handleGeneratePDF()}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate PDF'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'generating' && (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generating PDF Report</h3>
              <p className="text-sm text-gray-600">Please wait while we process your consignments...</p>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Generated Successfully</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your consignment report has been downloaded to your device.
              </p>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Again
                </button>
                <button
                  onClick={handlePreview}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep('select-type')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Generate Another Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
