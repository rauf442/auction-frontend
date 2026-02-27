// frontend/src/app/public/consignment/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'

export default function PublicConsignmentPage() {
  const params = useParams()
  const consignmentId = params.id as string

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    let currentBlobUrl: string | null = null

    const fetchPublicPDF = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch the public PDF for this consignment
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${backendUrl}/api/public/consignments/${consignmentId}/receipt-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load PDF' }))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        // Only update state if component is still mounted
        if (isMounted) {
          currentBlobUrl = url
          setPdfUrl(url)
        }

      } catch (err: any) {
        console.error('Error loading public PDF:', err)
        if (isMounted) {
          setError(err.message || 'Failed to load consignment document')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (consignmentId) {
      fetchPublicPDF()
    }

    // Cleanup function
    return () => {
      isMounted = false
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [consignmentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Document</h2>
          <p className="text-gray-600">Please wait while we prepare your consignment document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Unavailable</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            This document may not be publicly available or has been removed.
          </p>
        </div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
          <p className="text-gray-600">
            The requested consignment document could not be found.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Consignment Document</h1>
              <p className="text-sm text-gray-500">ID: {consignmentId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href={pdfUrl}
              download={`consignment-${consignmentId}.pdf`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1">
        <iframe
          src={pdfUrl}
          className="w-full h-screen border-0"
          title={`Consignment ${consignmentId} Document`}
          style={{
            minHeight: 'calc(100vh - 80px)' // Account for header height
          }}
        />
      </div>
    </div>
  )
}
