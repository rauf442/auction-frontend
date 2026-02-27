// frontend/src/components/items/common/ClientInfoSection.tsx
"use client"

import React, { useState } from 'react'

interface ClientInfo {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
}

interface ClientInfoSectionProps {
  clientId?: string
  clientInfo: ClientInfo
  onClientIdChange?: (clientId: string) => void
  onClientInfoChange: (clientInfo: ClientInfo) => void
  isPublicForm?: boolean // Whether this is being used in public form
}

export default function ClientInfoSection({
  clientId = '',
  clientInfo,
  onClientIdChange,
  onClientInfoChange,
  isPublicForm = false
}: ClientInfoSectionProps) {
  const [useExistingClient, setUseExistingClient] = useState(false)

  const handleToggle = (useExisting: boolean) => {
    setUseExistingClient(useExisting)
    if (useExisting) {
      // Clear client info when switching to existing client
      onClientInfoChange({})
    } else {
      // Clear client ID when switching to new client info
      if (onClientIdChange) {
        onClientIdChange('')
      }
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        {isPublicForm ? 'Your Information' : 'Client Information'}
      </h3>
      
      {/* Toggle between existing client ID and new client info - Available for all forms */}
      <div className="mb-4">
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              useExistingClient
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 hover:border-blue-700'
            }`}
          >
            {isPublicForm ? 'I have a Client ID' : 'Use Existing Client ID'}
          </button>
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              !useExistingClient
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 hover:border-blue-700'
            }`}
          >
            {isPublicForm ? 'I am a new client' : 'Enter New Client Information'}
          </button>
        </div>
        {isPublicForm && (
          <p className="text-xs text-blue-600 mt-2">
            If you have previously consigned with us, you can use your existing Client ID. Otherwise, please provide your information below.
          </p>
        )}
      </div>

      {/* Existing Client ID Input */}
      {useExistingClient && onClientIdChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client ID *
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => onClientIdChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder={isPublicForm ? "Enter your Client ID" : "Enter existing client ID"}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {isPublicForm 
              ? "Enter your Client ID from previous consignments with us"
              : "Enter the ID of an existing client in the system"
            }
          </p>
        </div>
      )}

      {/* New Client Information Form */}
      {!useExistingClient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={clientInfo.first_name || ''}
              onChange={(e) => {
                const value = e.target.value
                // Only allow letters (a-z, A-Z) and spaces
                if (/^[a-zA-Z\s]*$/.test(value)) {
                  onClientInfoChange({
                    ...clientInfo,
                    first_name: value
                  })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="First Name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={clientInfo.last_name || ''}
              onChange={(e) => {
                const value = e.target.value
                // Only allow letters (a-z, A-Z) and spaces
                if (/^[a-zA-Z\s]*$/.test(value)) {
                  onClientInfoChange({
                    ...clientInfo,
                    last_name: value
                  })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Last Name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={clientInfo.email || ''}
              onChange={(e) => onClientInfoChange({
                ...clientInfo,
                email: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={clientInfo.phone || ''}
              onChange={(e) => {
                const value = e.target.value
                if (/^\d{0,10}$/.test(value)) {
                  onClientInfoChange({
                    ...clientInfo,
                    phone: value
                  })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Phone"
              maxLength={10}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company (optional)
            </label>
            <input
              type="text"
              value={clientInfo.company_name || ''}
              onChange={(e) => onClientInfoChange({
                ...clientInfo,
                company_name: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Company Name"
            />
          </div>
        </div>
      )}

      {isPublicForm && (
        <div className="mt-3 text-xs text-blue-600">
          ℹ️ This information will be used to create your client profile for consignment purposes.
        </div>
      )}
    </div>
  )
}
