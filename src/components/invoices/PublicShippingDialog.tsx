// frontend/src/components/invoices/PublicShippingDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Package, Calculator, CreditCard, Truck, MapPin, Building } from 'lucide-react'
import { LogisticsInfo } from '../../types/invoice'
import { countries } from '../../data/countries'
import { getCountryMapping } from '../../data/country-mappings'
import { calculateShippingInvoiceCost, inchesToCm, ItemDimensions, getBillableWeight, calculateVolumetricWeight } from '../../lib/shipping-calculator'
import { calculateInsuranceCost, parseDimensions } from '../../lib/invoice-utils'
import { InvoicesAPI } from '../../lib/invoices-api'

interface PublicShippingDialogProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  accessToken: string
  onSuccess?: () => void
}

export default function PublicShippingDialog({
  isOpen,
  onClose,
  invoice,
  accessToken,
  onSuccess
}: PublicShippingDialogProps) {
  const [step, setStep] = useState<'method' | 'address' | 'confirm'>('method')
  const [selectedMethod, setSelectedMethod] = useState<'metsab_courier' | 'customer_collection' | 'customer_courier'>('metsab_courier')

  // Get brand-specific courier display name
  const getCourierDisplayName = () => {
    return 'Our Courier'
  }
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    postal_code: '',
    country: 'United Kingdom'
  })
  const [shippingCost, setShippingCost] = useState(0)
  const [insuranceCost, setInsuranceCost] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (invoice && isOpen) {
      // Pre-fill address from invoice if available
      setShippingAddress({
        address: invoice.ship_to_address || '',
        city: invoice.ship_to_city || '',
        postal_code: invoice.ship_to_postal_code || '',
        country: invoice.ship_to_country || 'United Kingdom'
      })
    }
  }, [invoice, isOpen])

  useEffect(() => {
    // Calculate shipping costs when method or address changes
    if (selectedMethod === 'metsab_courier' && shippingAddress.country) {
      calculateShippingCosts()
    } else {
      setShippingCost(0)
      setInsuranceCost(0)
      setTotalCost(0)
    }
  }, [selectedMethod, shippingAddress.country, invoice])

  const calculateShippingCosts = () => {
    if (!invoice?.items || invoice.items.length === 0) {
      // Fallback dimensions if no items available
      const defaultDimensions: ItemDimensions[] = [{
        length: 30, // cm
        width: 20,  // cm
        height: 5,  // cm
        weight: 1.0 // kg
      }]

      const countryMapping = getCountryMapping(shippingAddress.country)
      const destination = countryMapping?.destination || 'within_uk'
      
      const calculatedShippingCost = Math.round(calculateShippingInvoiceCost(
        defaultDimensions,
        destination,
        shippingAddress.country
      ))

      const totalPrice = Number(invoice.total_amount) || 0
      const calculatedInsuranceCost = Math.round(calculateInsuranceCost(
        totalPrice,
        destination === 'within_uk' ? 'UK' : 'International'
      ))

      setShippingCost(calculatedShippingCost)
      setInsuranceCost(calculatedInsuranceCost)
      setTotalCost(calculatedShippingCost + calculatedInsuranceCost)
      return
    }

    // Calculate based on actual item dimensions
    const itemDimensions: ItemDimensions[] = invoice.items.map((item: any) => {
      const dimensions = parseDimensions(item.dimensions_inches || item.dimensions || item.dimensions_cm)
      
      return {
        length: inchesToCm(12 + 2), // Default length + packaging
        width: inchesToCm((dimensions?.width || 8) + 2),
        height: inchesToCm((dimensions?.height || 2) + 2),
        weight: 1.0 // Default weight
      }
    })

    const countryMapping = getCountryMapping(shippingAddress.country)
    const destination = countryMapping?.destination || 'within_uk'
    
    const calculatedShippingCost = Math.round(calculateShippingInvoiceCost(
      itemDimensions,
      destination,
      shippingAddress.country
    ))

    const totalPrice = Number(invoice.total_amount) || 0
    const calculatedInsuranceCost = Math.round(calculateInsuranceCost(
      totalPrice,
      destination === 'within_uk' ? 'UK' : 'International'
    ))

    setShippingCost(calculatedShippingCost)
    setInsuranceCost(calculatedInsuranceCost)
    setTotalCost(calculatedShippingCost + calculatedInsuranceCost)
  }

  const handleMethodSelection = (method: typeof selectedMethod) => {
    setSelectedMethod(method)
    if (method === 'metsab_courier') {
      setStep('address')
    } else {
      setStep('confirm')
    }
  }

  const handleAddressNext = () => {
    const newErrors: Record<string, string> = {}

    if (!shippingAddress.address.trim()) {
      newErrors.address = 'Address is required'
    }
    if (!shippingAddress.city.trim()) {
      newErrors.city = 'City is required'
    }
    if (!shippingAddress.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required'
    }
    if (!shippingAddress.country.trim()) {
      newErrors.country = 'Country is required'
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      setStep('confirm')
    }
  }

  const handleConfirmAndPay = async () => {
    try {
      setLoading(true)

      // First, update shipping information
      const shippingData = {
        logistics_method: selectedMethod,
        shipping_address: selectedMethod === 'metsab_courier' ? shippingAddress : null,
        shipping_cost: shippingCost,
        insurance_cost: insuranceCost,
        total_cost: totalCost
      }

      const result = await InvoicesAPI.updatePublicShipping(invoice.id, accessToken, shippingData)

      if (result.success) {
        // If there's a shipping cost, create Xero payment link
        if (totalCost > 0) {
          try {
            const paymentResult = await InvoicesAPI.createPublicShippingPaymentLink(
              invoice.id,
              accessToken,
              totalCost,
              invoice.client?.email || invoice.buyer_email
            )

            if (paymentResult.success) {
              // Open the payment link in a new tab
              window.open(paymentResult.paymentLink, '_blank')
              toast.success('Shipping information saved! Please complete the payment using the link that opened in a new tab.')
            } else {
              console.warn('Failed to create shipping payment link:', paymentResult.message)
              toast.error('Shipping information saved, but payment link creation failed. Please contact us for payment instructions.')
            }
          } catch (paymentError) {
            console.warn('Error creating shipping payment link:', paymentError)
            toast.error('Shipping information saved, but payment link creation failed. Please contact us for payment instructions.')
          }
        } else {
          // No shipping cost (customer collection or customer courier)
          toast.success('Shipping information saved successfully!')
        }

        onSuccess?.()
        onClose()
      } else {
        toast.error(result.message || 'Failed to update shipping information')
      }
    } catch (error: any) {
      console.error('Failed to confirm shipping:', error)
      toast.error('Failed to confirm shipping information')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getUKCountries = () => {
    return countries.filter(c => c.region === 'UK')
  }

  const getInternationalCountries = () => {
    return countries.filter(c => c.region !== 'UK').sort((a, b) => a.name.localeCompare(b.name))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Select Shipping Method
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'method' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <div className={`h-1 w-8 ${step !== 'method' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'address' ? 'bg-blue-600 text-white' : step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                <span className="text-sm font-medium">2</span>
              </div>
              <div className={`h-1 w-8 ${step === 'confirm' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                <span className="text-sm font-medium">3</span>
              </div>
            </div>
          </div>

          {/* Step 1: Method Selection */}
          {step === 'method' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Choose your preferred shipping method</h3>
              
              <div className="space-y-4">
                {/* Our Courier */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${selectedMethod === 'metsab_courier' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedMethod('metsab_courier')}
                >
                  <div className="flex items-start">
                    <div className="flex items-center h-5 mt-1">
                      <input
                        type="radio"
                        name="shipping_method"
                        value="metsab_courier"
                        checked={selectedMethod === 'metsab_courier'}
                        onChange={() => setSelectedMethod('metsab_courier')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 text-blue-600 mr-2" />
                        <h4 className="text-base font-medium text-gray-900">{getCourierDisplayName()}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        We'll arrange professional courier delivery to your address. Includes insurance and tracking.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Collection */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${selectedMethod === 'customer_collection' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedMethod('customer_collection')}
                >
                  <div className="flex items-start">
                    <div className="flex items-center h-5 mt-1">
                      <input
                        type="radio"
                        name="shipping_method"
                        value="customer_collection"
                        checked={selectedMethod === 'customer_collection'}
                        onChange={() => setSelectedMethod('customer_collection')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-green-600 mr-2" />
                        <h4 className="text-base font-medium text-gray-900">Collection from Office</h4>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Free
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Collect your items directly from our office. No shipping charges apply.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Courier */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${selectedMethod === 'customer_courier' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedMethod('customer_courier')}
                >
                  <div className="flex items-start">
                    <div className="flex items-center h-5 mt-1">
                      <input
                        type="radio"
                        name="shipping_method"
                        value="customer_courier"
                        checked={selectedMethod === 'customer_courier'}
                        onChange={() => setSelectedMethod('customer_courier')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-purple-600 mr-2" />
                        <h4 className="text-base font-medium text-gray-900">Your Own Courier</h4>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Free
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Arrange your own courier service. We'll coordinate the pickup from our office.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => handleMethodSelection(selectedMethod)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Address (only for Our Courier) */}
          {step === 'address' && selectedMethod === 'metsab_courier' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Enter your shipping address</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter your full address"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter city"
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.postal_code}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.postal_code ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter postal code"
                    />
                    {errors.postal_code && <p className="text-red-500 text-sm mt-1">{errors.postal_code}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.country ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <optgroup label="United Kingdom">
                      {getUKCountries().map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="International">
                      {getInternationalCountries().map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('method')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back
                </button>
                <button
                  onClick={handleAddressNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Confirm your shipping details</h3>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {selectedMethod === 'metsab_courier' ? <Truck className="h-6 w-6 text-blue-600" /> :
                     selectedMethod === 'customer_collection' ? <Building className="h-6 w-6 text-green-600" /> :
                     <Package className="h-6 w-6 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {selectedMethod === 'metsab_courier' ? getCourierDisplayName() :
                       selectedMethod === 'customer_collection' ? 'Collection from Office' :
                       'Your Own Courier'}
                    </h4>
                    
                    {selectedMethod === 'metsab_courier' ? (
                      <div className="mt-3 text-sm text-gray-600">
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mt-0.5 mr-2 text-gray-400" />
                          <div>
                            <p>{shippingAddress.address}</p>
                            <p>{shippingAddress.city}, {shippingAddress.postal_code}</p>
                            <p>{shippingAddress.country}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600">
                        {selectedMethod === 'customer_collection' ? 
                          'You will collect your items from our office.' :
                          'You will arrange your own courier for pickup from our office.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Cost Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Shipping Cost:</span>
                    <span>{formatCurrency(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Insurance Cost:</span>
                    <span>{formatCurrency(insuranceCost)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-base border-t pt-2 mt-2">
                    <span>Total Shipping:</span>
                    <span>{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(selectedMethod === 'metsab_courier' ? 'address' : 'method')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmAndPay}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 
                   totalCost > 0 ? `Confirm & Pay ${formatCurrency(totalCost)}` : 'Confirm Selection'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
