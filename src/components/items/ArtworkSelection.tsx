// frontend/src/components/items/ArtworkSelection.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { Artwork } from '@/lib/items-api'
import { fetchClients, Client, formatClientDisplay, getClientFullName } from '@/lib/clients-api'

interface ArtworkSelectionProps {
  artworks: Artwork[]
  selectedItems: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onClose: () => void
}

type SelectionMode = 'individual' | 'range' | 'client' | 'all'

interface RangeSelection {
  from: string
  to: string
}

export default function ArtworkSelection({
  artworks,
  selectedItems,
  onSelectionChange,
  onClose
}: ArtworkSelectionProps) {
  const [mode, setMode] = useState<SelectionMode>('individual')
  const [individualInput, setIndividualInput] = useState('')
  const [rangeSelection, setRangeSelection] = useState<RangeSelection>({ from: '', to: '' })
  const [selectedClient, setSelectedClient] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  
  // Load clients for client-based selection
  useEffect(() => {
    if (mode === 'client') {
      loadClients()
    }
  }, [mode])

  const loadClients = async () => {
    try {
      setLoadingClients(true)
      const response = await fetchClients({ status: 'active', limit: 1000 })
      if (response.success) {
        setClients(response.data)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  // Parse individual input (e.g., "1,2,3,5-8,10")
  const parseIndividualInput = (input: string): number[] => {
    const ids: number[] = []
    const parts = input.split(',').map(p => p.trim()).filter(p => p)
    
    for (const part of parts) {
      if (part.includes('-')) {
        // Range like "5-8"
        const [start, end] = part.split('-').map(s => parseInt(s.trim()))
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            ids.push(i)
          }
        }
      } else {
        // Single number
        const id = parseInt(part)
        if (!isNaN(id)) {
          ids.push(id)
        }
      }
    }
    
    return Array.from(new Set(ids)) // Remove duplicates
  }

  // Convert lot numbers to artwork IDs
  const getArtworkIdsByLotNumbers = (lotNumbers: number[]): string[] => {
    const selectedIds: string[] = []
    
    for (const lotNum of lotNumbers) {
      const artwork = artworks.find(a => 
        a.id && parseInt(a.id) === lotNum
      )
      if (artwork && artwork.id) {
        selectedIds.push(artwork.id)
      }
    }
    
    return selectedIds
  }

  // Get artworks by range
  const getArtworkIdsByRange = (from: string, to: string): string[] => {
    const fromNum = parseInt(from)
    const toNum = parseInt(to)
    
    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      return []
    }
    
    const selectedIds: string[] = []
    for (let i = fromNum; i <= toNum; i++) {
      const artwork = artworks.find(a => a.id && parseInt(a.id) === i)
      if (artwork && artwork.id) {
        selectedIds.push(artwork.id)
      }
    }
    
    return selectedIds
  }

  // Get artworks by client
  const getArtworkIdsByClient = (clientId: string): string[] => {
    return artworks
      .filter(a => a.vendor_id?.toString() === clientId)
      .map(a => a.id!)
      .filter(id => id)
  }

  const handleApply = () => {
    let newSelection: string[] = []
    
    switch (mode) {
      case 'individual':
        const lotNumbers = parseIndividualInput(individualInput)
        newSelection = getArtworkIdsByLotNumbers(lotNumbers)
        break
        
      case 'range':
        newSelection = getArtworkIdsByRange(rangeSelection.from, rangeSelection.to)
        break
        
      case 'client':
        newSelection = getArtworkIdsByClient(selectedClient)
        break
        
      case 'all':
        newSelection = artworks.map(a => a.id!).filter(id => id)
        break
    }
    
    onSelectionChange(newSelection)
    onClose()
  }

  const handleAddToSelection = () => {
    let additionalSelection: string[] = []
    
    switch (mode) {
      case 'individual':
        const lotNumbers = parseIndividualInput(individualInput)
        additionalSelection = getArtworkIdsByLotNumbers(lotNumbers)
        break
        
      case 'range':
        additionalSelection = getArtworkIdsByRange(rangeSelection.from, rangeSelection.to)
        break
        
      case 'client':
        additionalSelection = getArtworkIdsByClient(selectedClient)
        break
        
      case 'all':
        additionalSelection = artworks.map(a => a.id!).filter(id => id)
        break
    }
    
    const combined = Array.from(new Set([...selectedItems, ...additionalSelection]))
    onSelectionChange(combined)
    onClose()
  }

  const getPreviewCount = (): number => {
    switch (mode) {
      case 'individual':
        const lotNumbers = parseIndividualInput(individualInput)
        return getArtworkIdsByLotNumbers(lotNumbers).length
        
      case 'range':
        return getArtworkIdsByRange(rangeSelection.from, rangeSelection.to).length
        
      case 'client':
        return getArtworkIdsByClient(selectedClient).length
        
      case 'all':
        return artworks.length
        
      default:
        return 0
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Select Artworks</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selection Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selection Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SelectionMode)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="individual">Individual Lot Numbers</option>
            <option value="range">Range of Lot Numbers</option>
            <option value="client">By Client/Consigner</option>
            <option value="all">Select All</option>
          </select>
        </div>

        {/* Individual Selection */}
        {mode === 'individual' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inventory IDs
            </label>
            <input
              type="text"
              value={individualInput}
              onChange={(e) => setIndividualInput(e.target.value)}
              placeholder="e.g., 1,2,3 or 1-5,8,10-12"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter inventory ids separated by commas. Use dashes for ranges (e.g., 1-5).
            </p>
          </div>
        )}

        {/* Range Selection */}
        {mode === 'range' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inventory ID Range
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={rangeSelection.from}
                onChange={(e) => setRangeSelection(prev => ({ ...prev, from: e.target.value }))}
                placeholder="From"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              <span className="flex items-center text-gray-500">to</span>
              <input
                type="number"
                value={rangeSelection.to}
                onChange={(e) => setRangeSelection(prev => ({ ...prev, to: e.target.value }))}
                placeholder="To"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        )}

        {/* Client Selection */}
        {mode === 'client' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client/Consigner
            </label>
            {loadingClients ? (
              <div className="text-sm text-gray-500">Loading clients...</div>
            ) : (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {formatClientDisplay(client)} - {getClientFullName(client)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* All Selection */}
        {mode === 'all' && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              This will select all {artworks.length} artworks currently visible.
            </p>
          </div>
        )}

        {/* Preview */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Preview:</span> {getPreviewCount()} artwork(s) will be selected
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleApply}
            disabled={getPreviewCount() === 0}
            className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Replace Selection
          </button>
          <button
            onClick={handleAddToSelection}
            disabled={getPreviewCount() === 0}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Selection
          </button>
        </div>

        {selectedItems.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Currently selected: {selectedItems.length} artwork(s)
          </div>
        )}
      </div>
    </div>
  )
}
