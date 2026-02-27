// frontend/src/app/invoice/[invoiceId]/track/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Package, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react'

interface TrackingInfo {
  invoiceId: string
  trackingNumber?: string
  status: 'pending' | 'in_transit' | 'delivered'
  description?: string
  carrier?: string
  estimatedDelivery?: string
}

export default function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params)
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrackingInfo()
  }, [resolvedParams.id])

  const fetchTrackingInfo = async () => {
    try {
      setLoading(true)
      // For demo purposes, we'll simulate tracking data
      // In a real app, this would fetch from a backend API
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate loading
      
      // Mock tracking data
      const mockTracking: TrackingInfo = {
        invoiceId: resolvedParams.id,
        trackingNumber: Math.random() > 0.5 ? 'EV123456789GB' : undefined,
        status: ['pending', 'in_transit', 'delivered'][Math.floor(Math.random() * 3)] as any,
        description: 'Your artwork is being prepared for shipment',
        carrier: 'Evri',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      setTrackingInfo(mockTracking)
    } catch (err) {
      setError('Failed to fetch tracking information')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-500" />
      case 'in_transit':
        return <Package className="h-6 w-6 text-blue-500" />
      case 'delivered':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      default:
        return <XCircle className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Pending'
      case 'in_transit':
        return 'In Transit'
      case 'delivered':
        return 'Delivered'
      default:
        return 'Unknown Status'
    }
  }

  const redirectToCarrier = () => {
    if (trackingInfo?.trackingNumber) {
      window.open(`https://www.evri.com/track/parcel/${trackingInfo.trackingNumber}/details`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-bounce" />
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-600">Invoice: {resolvedParams.id}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {trackingInfo ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {trackingInfo.trackingNumber ? (
              <>
                {/* Status Card */}
                <div className="border-b border-gray-200 pb-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {getStatusIcon(trackingInfo.status)}
                      <div className="ml-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {getStatusText(trackingInfo.status)}
                        </h2>
                        <p className="text-sm text-gray-600">Tracking Number: {trackingInfo.trackingNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={redirectToCarrier}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Track on {trackingInfo.carrier}</span>
                    </button>
                  </div>
                  
                  {trackingInfo.description && (
                    <p className="text-gray-700 mb-4">{trackingInfo.description}</p>
                  )}
                  
                  {trackingInfo.estimatedDelivery && trackingInfo.status !== 'delivered' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Estimated Delivery:</strong>{' '}
                        {new Date(trackingInfo.estimatedDelivery).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress Timeline */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Shipping Progress</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order Confirmed</p>
                        <p className="text-xs text-gray-500">Your order has been processed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {trackingInfo.status === 'pending' ? (
                        <Clock className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">In Transit</p>
                        <p className="text-xs text-gray-500">Package is on its way</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {trackingInfo.status === 'delivered' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Delivered</p>
                        <p className="text-xs text-gray-500">Package has been delivered</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No Tracking Number */
              <div className="text-center py-8">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Information Will Be Available Post Payment</h2>
                <p className="text-gray-600 mb-6">
                The tracking number will be available once the invoice has been paid.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    Please check back later for tracking updates, or contact us if you have any questions.
                  </p>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Email Support</p>
                  <a href="mailto:info@metsabauctions.com" className="text-blue-600 hover:text-blue-800">
                    info@metsabauctions.com
                  </a>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Phone Support</p>
                  <a href="tel:+442034884977" className="text-blue-600 hover:text-blue-800">
                    +44 20 3488 4977
                  </a>
                </div>
                <div>
                  <p className="font-medium text-gray-900">WhatsApp</p>
                  <a href="https://wa.me/447350498782" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                    +44 7350 498782
                  </a>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Business Hours</p>
                  <p className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM GMT</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600">
              We couldn't find any tracking information for invoice {resolvedParams.id}.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            © 2025 MetSab Auctions Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
} 