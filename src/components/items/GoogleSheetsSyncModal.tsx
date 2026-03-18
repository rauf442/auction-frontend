// frontend/src/components/items/GoogleSheetsSyncModal.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, RefreshCw, Globe, Save, AlertCircle, CheckCircle, Upload, Download, Settings, Zap, Play, Square, Activity, Timer, Radio } from 'lucide-react'
import { 
  loadBrandGoogleSheetUrl, 
  saveBrandGoogleSheetUrl, 
  syncArtworksToGoogleSheet,
  syncArtworksFromGoogleSheet 
} from '@/lib/google-sheets-api'

import {
  getSyncStatus,
  triggerManualSync,
  startScheduledSync,
  stopScheduledSync,
  startPollingSync,
  stopPollingSync,
  debugSyncManager,
  SyncStatus as SyncStatusType,
  SyncResult
} from '@/lib/items-api'

interface GoogleSheetsSyncModalProps {
  onClose: () => void
  onSyncComplete?: (result: any) => void
  selectedItems?: string[]
  allItems?: any[]
  currentBrand?: string
  isLoadingAllItems?: boolean
}

export default function GoogleSheetsSyncModal({
  onClose,
  onSyncComplete,
  selectedItems = [],
  allItems = [],
  currentBrand = 'MSABER',
  isLoadingAllItems = false
}: GoogleSheetsSyncModalProps) {
  const [selectedBrand, setSelectedBrand] = useState(currentBrand)
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [showUrlConfig, setShowUrlConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loadingAllItems, setLoadingAllItems] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasUrlConfig, setHasUrlConfig] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'active' | 'inactive'>('checking')
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null)
  const [syncManagerLoading, setSyncManagerLoading] = useState(false)
  const [manualSyncResult, setManualSyncResult] = useState<SyncResult | null>(null)
  const [syncMode, setSyncMode] = useState<'automatic' | 'manual-to' | 'manual-from'>('automatic')
  
  // Brand options (in a real app, these would come from an API)
  const brandOptions = [
    { value: 'MSABER', label: 'MSaber' },
    { value: 'AURUM', label: 'Aurum' },
    { value: 'METSAB', label: 'Metsab' }
  ]

  useEffect(() => {
    loadBrandConfig(selectedBrand),
    checkWebhookStatus()
  }, [selectedBrand])


  const handleClose = () => {
    onClose?.()
    window.location.reload()
  }

  const loadBrandConfig = async (brand: string) => {
    try {
      setLoading(true)
      const url = await loadBrandGoogleSheetUrl(brand, 'artworks')
      if (url) {
        setGoogleSheetUrl(url)
        setEditingUrl(url)
        setHasUrlConfig(true)
      } else {
        setGoogleSheetUrl('')
        setEditingUrl('')
        setHasUrlConfig(false)
      }
    } catch (error: any) {
      console.error('Error loading brand config:', error)
      setError(`Failed to load configuration for ${brand}: ${error.message}`)
      setHasUrlConfig(false)
    } finally {
      setLoading(false)
    }
  }

  const saveUrlConfig = async () => {
    if (!editingUrl.trim()) {
      setError('Please enter a Google Sheets URL')
      return
    }

    try {
      setLoading(true)
      const success = await saveBrandGoogleSheetUrl(selectedBrand, editingUrl.trim(), 'artworks')
      if (success) {
        setGoogleSheetUrl(editingUrl.trim())
        setHasUrlConfig(true)
        setShowUrlConfig(false)
        setSuccess('Google Sheets URL saved successfully!')
        setError('')
      } else {
        setError('Failed to save Google Sheets URL. Please check your permissions.')
      }
    } catch (error: any) {
      console.error('Error saving URL config:', error)
      setError(`Failed to save URL: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const performSync = async () => {
    if (!googleSheetUrl.trim()) {
      setError('Please configure a Google Sheets URL first')
      return
    }

    try {
      setSyncing(true)
      setError('')
      setSuccess('')
      if (!googleSheetUrl) {
        setError('Please configure a Google Sheets URL first')
        return
      }


      if (syncMode === 'manual-to') {
        // Sync TO Google Sheets (export our data)
        const itemsToSync = selectedItems.length > 0 
          ? allItems.filter(item => selectedItems.includes(item.id))
          : allItems

        if (itemsToSync.length === 0) {
          setError('No items to sync. Please select items or ensure you have data.')
          return
        }

        const result = await syncArtworksToGoogleSheet(itemsToSync, googleSheetUrl, selectedBrand)
        
        if (result.success) {
          setSuccess(`✅ Successfully synced ${itemsToSync.length} artworks to Google Sheets!`)
          onSyncComplete?.(result)
        } else {
          setError(result.error || 'Sync failed')
        }
      } else {
        // Sync FROM Google Sheets (import data)
        const result = await syncArtworksFromGoogleSheet(googleSheetUrl, selectedBrand)
        
        if (result.success) {
          setSuccess(`✅ Successfully imported ${result.upserted || 0} artworks from Google Sheets!`)
          onSyncComplete?.(result)
        } else {
          setError(result.error || 'Import failed')
        }
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      setError(`Sync failed: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleManualSync = async () => {
    try {
      setSyncManagerLoading(true)
      setError('')
      setManualSyncResult(null)

      const result = await triggerManualSync()
      setManualSyncResult(result)

      if (result.success) {
        setSuccess(result.message)
        if (onSyncComplete) {
          onSyncComplete({ success: true, changesProcessed: result.changesProcessed })
        }
        // Reload sync status
        loadSyncStatus()
      } else {
        setError(result.message)
      }

      setTimeout(() => {
        setManualSyncResult(null)
        setSuccess('')
        setError('')
      }, 5000)

    } catch (error: any) {
      console.error('Error triggering manual sync:', error)
      setError(error.message || 'Failed to trigger manual sync')
    } finally {
      setSyncManagerLoading(false)
    }
  }

  const handleStartScheduled = async () => {
    try {
      setSyncManagerLoading(true)
      setError('')

      const result = await startScheduledSync()
      if (result.success) {
        setSuccess(result.message)
        loadSyncStatus()
      } else {
        setError(result.message)
      }
    } catch (error: any) {
      console.error('Error starting scheduled sync:', error)
      setError(error.message || 'Failed to start scheduled sync')
    } finally {
      setSyncManagerLoading(false)
    }
  }

  const handleStopScheduled = async () => {
    try {
      setSyncManagerLoading(true)
      setError('')

      const result = await stopScheduledSync()
      if (result.success) {
        setSuccess(result.message)
        loadSyncStatus()
      } else {
        setError(result.message)
      }
    } catch (error: any) {
      console.error('Error stopping scheduled sync:', error)
      setError(error.message || 'Failed to stop scheduled sync')
    } finally {
      setSyncManagerLoading(false)
    }
  }

  const handleStartPolling = async () => {
    try {
      setSyncManagerLoading(true)
      setError('')

      const result = await startPollingSync(15)
      if (result.success) {
        setSuccess(result.message)
        loadSyncStatus()
      } else {
        setError(result.message)
      }
    } catch (error: any) {
      console.error('Error starting polling sync:', error)
      setError(error.message || 'Failed to start polling sync')
    } finally {
      setSyncManagerLoading(false)
    }
  }

  const handleStopPolling = async () => {
    try {
      setSyncManagerLoading(true)
      setError('')

      const result = await stopPollingSync()
      if (result.success) {
        setSuccess(result.message)
        loadSyncStatus()
      } else {
        setError(result.message)
      }
    } catch (error: any) {
      console.error('Error stopping polling sync:', error)
      setError(error.message || 'Failed to stop polling sync')
    } finally {
      setSyncManagerLoading(false)
    }
  }

  const checkWebhookStatus = async () => {
    try {
      setWebhookStatus('checking')
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webhooks/google-sheets/health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setWebhookStatus('active')
      } else {
        setWebhookStatus('inactive')
      }
    } catch (error) {
      console.error('Error checking webhook status:', error)
      setWebhookStatus('inactive')
    }
  }

    const loadSyncStatus = async () => {
      try {
        console.log('🔄 Loading sync status...')
        const result = await getSyncStatus()
        console.log('✅ Sync status result:', result)
  
        if (result.success) {
          setSyncStatus(result.status)
          setError('') // Clear any previous errors
          console.log('✅ Sync status loaded successfully:', result.status)
        } else {
          console.error('❌ Sync status failed:', result)
          setError('Failed to load sync status')
        }
      } catch (error: any) {
        console.error('❌ Error loading sync status:', error)
  
        // If there's an error, try the debug function to get more info
        if (error.message.includes('Route not found') || error.message.includes('404')) {
          console.log('🔧 Running sync manager debug due to route error...')
          try {
            const debugResult = await debugSyncManager()
            console.log('🔧 Debug result:', debugResult)
  
            if (!debugResult.success && debugResult.details?.tokenPresent === false) {
              setError('🔐 Authentication required. Please log in and try again. Use the "Check Auth" button to verify your login status.')
            } else {
              setError('🔧 Sync manager is not available. Please check backend configuration.')
            }
          } catch (debugError) {
            console.error('Debug function also failed:', debugError)
  
            // Try no-auth version as fallback
            console.log('🔄 Trying no-auth fallback...')
            try {
              const { getSyncStatusNoAuth } = await import('@/lib/clients-api')
              const noAuthResult = await getSyncStatusNoAuth()
              console.log('✅ No-auth fallback successful:', noAuthResult)
              setSyncStatus(noAuthResult.status)
              setError('⚠️ Using no-auth mode (login recommended for full functionality)')
            } catch (noAuthError) {
              console.error('No-auth fallback also failed:', noAuthError)
              setError('❌ Unable to connect to sync manager. Please check your connection and authentication.')
            }
          }
        } else {
          // For authentication errors
          if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('403')) {
            setError('🔐 Please log in to access sync manager features. Use the "Check Auth" button to verify your login status.')
          } else {
            // For other errors, show a generic message
            setError('❌ Unable to load sync status. Please try again.')
          }
        }
      }
    }

    const handleSyncToGoogleSheets = async () => {
    try {
      setSyncing(true)
      setError('')
      setSuccess('')

      if (!googleSheetUrl) {
        setError('Please configure a Google Sheets URL first')
        return
      }

      // Use the new API endpoint to sync directly to Google Sheets
      const token = localStorage.getItem('token')
      const itemsToSync = selectedItems.length > 0 ? allItems.filter(item => selectedItems.includes(item.id)) : allItems;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/sync-to-google-sheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          artworks: itemsToSync
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync to Google Sheets')
      }

      const result = await response.json()
      setSuccess(`Successfully synced ${result.count} consignments to Google Sheets!`)
      
      if (onSyncComplete) {
        onSyncComplete({ success: true, count: result.count })
      }

    } catch (error: any) {
      console.error('Error syncing to Google Sheets:', error)
      setError(error.message || 'Failed to sync consignments to Google Sheets')
    } finally {
      setSyncing(false)
    }
  }


    const handleSyncFromGoogleSheets = async () => {
      try {
        setSyncing(true)
        setError('')
        setSuccess('')

        if (!googleSheetUrl) {
          setError('Please configure a Google Sheets URL first')
          return
        }

        // Call backend import endpoint to import/sync from Google Sheets
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/sync-google-sheet`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sheet_url: googleSheetUrl
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to import from Google Sheets')
        }

        const result = await response.json()
        setSuccess(
          `Import completed: ${result.upserted} imported, ${result.summary.errorCount} errors`
        )

        
        if (onSyncComplete) {
          onSyncComplete({ success: true, results: result.results })
        }

      } catch (error: any) {
        console.error('Error syncing from Google Sheets:', error)
        setError(error.message || 'Failed to sync consignments from Google Sheets')
      } finally {
        setSyncing(false)
      }
    }




  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Sheets Sync</h2>
              <p className="text-sm text-gray-600">Sync your artworks with Google Sheets</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Google Sheets URL Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Google Sheets URL for {selectedBrand}
              </label>
              <button
                onClick={() => setShowUrlConfig(!showUrlConfig)}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span>Configure</span>
              </button>
            </div>
            
            {hasUrlConfig ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">Configured</span>
                </div>
                <a
                  href={googleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 hover:text-green-800 hover:underline mt-1 block break-all cursor-pointer transition-colors"
                  title="Open Google Sheets (opens in new tab)"
                >
                  {googleSheetUrl}
                </a>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">Not Configured</span>
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  Please add your Google Sheets URL to enable sync
                </div>
              </div>
            )}

            {showUrlConfig && (
              <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Sheets URL
                    </label>
                    <input
                      type="url"
                      value={editingUrl}
                      onChange={(e) => setEditingUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit#gid=0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Make sure the sheet is publicly accessible or shared with the service account
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveUrlConfig}
                      disabled={loading || !editingUrl.trim()}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save URL
                    </button>
                    <button
                      onClick={() => setShowUrlConfig(false)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
              {/* Sync Manager Status */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-blue-800 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Sync Manager Status
          </h4>
          <button
            onClick={loadSyncStatus}
            disabled={syncManagerLoading}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncManagerLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Scheduled Sync */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Scheduled</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              syncStatus?.scheduledActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {syncStatus?.scheduledActive ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Polling Sync */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <Radio className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Polling</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              syncStatus?.pollingActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {syncStatus?.pollingActive ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Webhook Sync */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Webhook</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              webhookStatus === 'active'
                ? 'bg-green-100 text-green-700'
                : webhookStatus === 'checking'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {webhookStatus === 'checking' && 'Checking...'}
              {webhookStatus === 'active' && 'Active'}
              {webhookStatus === 'inactive' && 'Inactive'}
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        {syncStatus?.lastSyncTimestamps && Object.keys(syncStatus.lastSyncTimestamps).length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-blue-700">
              Last sync: {new Date(Object.values(syncStatus.lastSyncTimestamps)[0]).toLocaleString()}
            </p>
          </div>
        )}

        {/* Sync Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              console.log('🧪 Testing backend connectivity...')
              import('@/lib/clients-api').then(({ testBackendConnectivity }) => {
                testBackendConnectivity().then(result => {
                  console.log('🧪 Backend connectivity test:', result)
                  if (result.success) {
                    toast.success('✅ Backend connection successful!')
                  } else {
                    toast.error(`❌ Backend connection failed: ${result.message}`)
                  }
                })
              })
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center"
          >
            <Activity className="h-4 w-4 mr-2" />
            Test Connection
          </button>

          <button
            onClick={() => {
              console.log('🔑 Testing authentication...')
              const token = localStorage.getItem('token')
              console.log('🔑 Token present:', !!token)
              console.log('🔑 Token value:', token ? token.substring(0, 20) + '...' : 'null')

              if (!token) {
                toast.error('❌ No authentication token found. Please log in first.')
              } else {
                toast.success('✅ Authentication token found. Token looks valid.')
              }
            }}
            className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            Check Auth
          </button>

          <button
            onClick={() => {
              console.log('🔧 Testing sync manager...')
              import('@/lib/clients-api').then(({ debugSyncManager }) => {
                debugSyncManager().then(result => {
                  console.log('🔧 Sync manager debug:', result)
                  if (result.success) {
                    toast.success('✅ Sync manager working!')
                  } else {
                    toast.error(`❌ Sync manager issue: ${result.message}`)
                  }
                })
              })
            }}
            className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            Debug Sync
          </button>

          <button
            onClick={() => {
              console.log('🔧 Testing sync manager (no auth)...')
              import('@/lib/clients-api').then(({ getSyncStatusNoAuth }) => {
                getSyncStatusNoAuth().then(result => {
                  console.log('🔧 Sync manager (no auth):', result)
                  if (result.success) {
                    toast.success('✅ Sync manager working (no auth)!')
                  } else {
                    toast.error(`❌ Sync manager issue: ${JSON.stringify(result)}`)
                  }
                }).catch(error => {
                  console.error('🔧 Sync manager (no auth) error:', error)
                  toast.error(`❌ Sync manager error: ${error.message}`)
                })
              })
            }}
            className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
          >
            <Activity className="h-4 w-4 mr-2" />
            Test Sync (No Auth)
          </button>

          <button
            onClick={handleManualSync}
            disabled={syncManagerLoading || !hasUrlConfig}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {syncManagerLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Manual Sync
          </button>

          {syncStatus?.scheduledActive ? (
            <button
              onClick={handleStopScheduled}
              disabled={syncManagerLoading}
              className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Scheduled
            </button>
          ) : (
            <button
              onClick={handleStartScheduled}
              disabled={syncManagerLoading || !hasUrlConfig}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Scheduled
            </button>
          )}

          {syncStatus?.pollingActive ? (
            <button
              onClick={handleStopPolling}
              disabled={syncManagerLoading}
              className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Polling
            </button>
          ) : (
            <button
              onClick={handleStartPolling}
              disabled={syncManagerLoading || !hasUrlConfig}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Polling
            </button>
          )}
        </div>

        {/* Manual Sync Result */}
        {manualSyncResult && (
          <div className={`mt-3 p-3 rounded-lg ${
            manualSyncResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {manualSyncResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                manualSyncResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {manualSyncResult.message}
              </span>
            </div>
            {manualSyncResult.changesProcessed !== undefined && (
              <p className="text-xs text-gray-600 mt-1">
                Changes processed: {manualSyncResult.changesProcessed}
              </p>
            )}
          </div>
        )}
      </div>
      
          {/* Sync Info */}
          {syncMode === 'manual-to' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Export Summary:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Selected items: {selectedItems.length > 0 ? selectedItems.length : 'All items'}</li>
                  <li>
                    • Total items available:
                    {isLoadingAllItems ? (
                      <span className="inline-flex items-center ml-2">
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        Loading all items...
                      </span>
                    ) : (
                      ` ${allItems.length}`
                    )}
                  </li>
                  <li>• Target brand: {selectedBrand}</li>
                </ul>
              </div>
            </div>
          )}

          {syncMode === 'manual-from' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Import Info:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Will import data from the configured Google Sheet</li>
                  <li>• Existing items will be updated, new items will be created</li>
                  <li>• Target brand: {selectedBrand}</li>
                </ul>
              </div>
            </div>
          )}

      {/* Legacy Automatic Sync Status */}
      {hasUrlConfig && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-800">Legacy Webhook Sync</h4>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              webhookStatus === 'active'
                ? 'bg-green-100 text-green-700'
                : webhookStatus === 'checking'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {webhookStatus === 'checking' && 'Checking...'}
              {webhookStatus === 'active' && 'Active'}
              {webhookStatus === 'inactive' && 'Inactive'}
            </div>
          </div>
          <p className="text-sm text-green-700">
            Legacy webhook system. Use the Sync Manager above for better control and monitoring.
          </p>
        </div>
      )}

      {/* Sync Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sync Options:
            </label>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  syncMode === 'automatic'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSyncMode('automatic')}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Automatic Sync (Recommended)</span>
                </div>
                <p className="text-xs text-gray-600">
                  Real-time sync when changes are made in Google Sheets. No manual action required.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    syncMode === 'manual-to'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSyncMode('manual-to')}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Upload className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Manual Export</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Export client data from database to Google Sheets
                  </p>
                </div>
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    syncMode === 'manual-from'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSyncMode('manual-from')}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Download className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Manual Import</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Import client data from Google Sheets to database
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-800 text-sm">{success}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={syncing}
          >
            Cancel
          </button>
          {syncMode === 'automatic' ? (
            <div className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Automatic Sync Active
            </div>
          ) : (
            <button
              onClick={syncMode === 'manual-to' ? handleSyncToGoogleSheets : handleSyncFromGoogleSheets}
              disabled={syncing || !hasUrlConfig}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {syncMode === 'manual-to' ? 'Export to Sheets' : 'Import from Sheets'}
                </>
              )}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  )
  
}

