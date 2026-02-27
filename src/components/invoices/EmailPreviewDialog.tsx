// frontend/admin/src/components/invoices/EmailPreviewDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Mail, Send, Loader2 } from 'lucide-react'

/**
 * Extract the body content from a full HTML email template
 * This removes the DOCTYPE, html, head, and body tags to prevent conflicts
 * when rendering inside another HTML document
 */
function extractEmailBodyContent(htmlContent: string): string {
  if (!htmlContent) return ''

  // Try to extract content between <body> tags first
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    return bodyMatch[1].trim()
  }

  // If no body tags, try to find the main content area
  // Look for common email template structures
  const contentPatterns = [
    // Look for main content div
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Look for any div with max-width (common in email templates)
    /<div[^>]*style="[^"]*max-width[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Look for the first main div after any header
    /<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*footer/i,
  ]

  for (const pattern of contentPatterns) {
    const match = htmlContent.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  // Fallback: remove DOCTYPE, html, head tags and return the rest
  const cleaned = htmlContent
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
    .replace(/<body[^>]*>/i, '')
    .replace(/<\/body>/i, '')
    .trim()

  return cleaned
}

interface EmailPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  onSend: () => Promise<void>
  emailType: 'winning_bid' | 'payment_confirmation' | 'shipping_confirmation' | 'vendor_sale_notification' | 'vendor_payment_confirmation'
  invoiceId: number
  invoiceNumber: string
  recipientEmail: string
  recipientName: string
}

interface EmailPreview {
  subject: string
  body: string
  to: string
  from: string
}

export default function EmailPreviewDialog({
  isOpen,
  onClose,
  onSend,
  emailType,
  invoiceId,
  invoiceNumber,
  recipientEmail,
  recipientName
}: EmailPreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<EmailPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emailTypeLabels = {
    winning_bid: 'Winning Bid Notification',
    payment_confirmation: 'Payment Confirmation',
    shipping_confirmation: 'Shipping Confirmation',
    vendor_sale_notification: 'Vendor Sale Notification',
    vendor_payment_confirmation: 'Vendor Payment Confirmation'
  }

  useEffect(() => {
    if (isOpen) {
      loadEmailPreview()
    }
  }, [isOpen, emailType, invoiceId])

  const loadEmailPreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${invoiceId}/email-preview?type=${emailType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load email preview')
      }

      setPreview(data.preview)
    } catch (err: any) {
      console.error('Error loading email preview:', err)
      setError(err.message || 'Failed to load email preview')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      await onSend()
      onClose()
    } catch (err: any) {
      console.error('Error sending email:', err)
      setError(err.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
      <div className="relative top-10 mx-auto p-0 border w-full max-w-4xl shadow-lg rounded-lg bg-white mb-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Email Preview: {emailTypeLabels[emailType]}
              </h3>
              <p className="text-sm text-gray-500">
                Invoice: {invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading email preview...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={loadEmailPreview}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Email Metadata */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-700 w-20">From:</span>
                  <span className="text-sm text-gray-900">{preview.from}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-700 w-20">To:</span>
                  <span className="text-sm text-gray-900">{preview.to}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-700 w-20">Subject:</span>
                  <span className="text-sm text-gray-900 font-medium">{preview.subject}</span>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Email Body Preview</span>
                </div>
                <div className="p-0 bg-white max-h-96 overflow-y-auto">
                  {/* Email-like styling container */}
                  <div className="border border-gray-200 m-4">
                    <div
                      className="p-4 min-h-[300px]"
                      style={{
                        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#374151'
                      }}
                      dangerouslySetInnerHTML={{ __html: extractEmailBodyContent(preview.body) }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {recipientName && (
              <span>Sending to: <strong>{recipientName}</strong> ({recipientEmail})</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || loading || !!error}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

