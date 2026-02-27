// frontend/src/components/clients/ClientGoogleSheetsSync.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, RefreshCw, Globe, Save, AlertCircle, CheckCircle, Upload, Download, Settings, Zap, Clock, Play, Square, Activity, Timer, Radio } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { getGoogleSheetsUrlForModule, updateGoogleSheetsUrl } from '@/lib/app-settings-api'
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
} from '@/lib/clients-api'

interface ClientGoogleSheetsSyncProps {
  onClose: () => void
  onSyncComplete?: (result: any) => void
  selectedClients?: number[]
}

export default function ClientGoogleSheetsSync({
  onClose,
  onSyncComplete,
  selectedClients = []
}: ClientGoogleSheetsSyncProps) {
  const { brand } = useBrand()
  const [syncMode, setSyncMode] = useState<'automatic' | 'manual-to' | 'manual-from'>('automatic')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [showUrlConfig, setShowUrlConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasUrlConfig, setHasUrlConfig] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'active' | 'inactive'>('checking')
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null)
  const [syncManagerLoading, setSyncManagerLoading] = useState(false)
  const [manualSyncResult, setManualSyncResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    console.log('🚀 ClientGoogleSheetsSync component mounted')
    console.log('🔗 Environment check:', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV
    })
    loadGoogleSheetConfig()
    checkWebhookStatus()
    loadSyncStatus()
  }, [])


    const handleClose = () => {
      onClose?.()
      window.location.reload()
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

  const loadGoogleSheetConfig = async () => {
    try {
      setLoading(true)
      const url = await getGoogleSheetsUrlForModule('clients')
      setGoogleSheetUrl(url)
      setEditingUrl(url)
      setHasUrlConfig(!!url)
    } catch (error: any) {
      console.error('Error loading Google Sheets config:', error)
      setError('Failed to load Google Sheets configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveGoogleSheetUrl = async () => {
    try {
      setLoading(true)
      setError('')
      
      await updateGoogleSheetsUrl('clients', editingUrl)
      setGoogleSheetUrl(editingUrl)
      setHasUrlConfig(!!editingUrl)
      setShowUrlConfig(false)
      setSuccess('Google Sheets URL saved successfully!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving Google Sheets URL:', error)
      setError('Failed to save Google Sheets URL')
    } finally {
      setLoading(false)
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients/sync-to-google-sheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          client_ids: selectedClients.length > 0 ? selectedClients : undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync to Google Sheets')
      }

      const result = await response.json()
      setSuccess(`Successfully synced ${result.count} clients to Google Sheets!`)
      
      if (onSyncComplete) {
        onSyncComplete({ success: true, count: result.count })
      }

    } catch (error: any) {
      console.error('Error syncing to Google Sheets:', error)
      setError(error.message || 'Failed to sync clients to Google Sheets')
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

      // Use the existing sync-google-sheet endpoint to import from Google Sheets
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients/sync-google-sheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          default_brand: brand
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync from Google Sheets')
      }

      const result = await response.json()
      setSuccess(`Successfully imported ${result.upserted || 0} clients from Google Sheets!`)
      
      if (onSyncComplete) {
        onSyncComplete({ success: true, imported: result.upserted || 0 })
      }

    } catch (error: any) {
      console.error('Error syncing from Google Sheets:', error)
      setError(error.message || 'Failed to sync clients from Google Sheets')
    } finally {
      setSyncing(false)
    }
  }

  if (loading && !syncing) {
    return (
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Google Sheets Sync - Clients</h3>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Sync clients {selectedClients.length > 0 ? `(${selectedClients.length} selected)` : '(all)'} with Google Sheets.
        </p>
      </div>

      {/* URL Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Google Sheets Configuration</h4>
          <button
            onClick={() => setShowUrlConfig(!showUrlConfig)}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
          >
            <Settings className="h-4 w-4 mr-1" />
            {showUrlConfig ? 'Hide' : 'Configure'}
          </button>
        </div>
        
        {hasUrlConfig && !showUrlConfig && (
          <div className="text-sm text-gray-600">
            <p>✓ Google Sheets URL configured</p>
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 block truncate cursor-pointer transition-colors"
              title="Open Google Sheets (opens in new tab)"
            >
              {googleSheetUrl}
            </a>
          </div>
        )}
        
        {!hasUrlConfig && !showUrlConfig && (
          <div className="text-sm text-red-600">
            ⚠ No Google Sheets URL configured. Click "Configure" to set one up.
          </div>
        )}

        {showUrlConfig && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheets URL:
              </label>
              <input
                type="url"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste your Google Sheets URL here. Make sure the sheet is accessible.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={saveGoogleSheetUrl}
                disabled={loading}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save URL'}
              </button>
              <button
                onClick={() => {
                  setShowUrlConfig(false)
                  setEditingUrl(googleSheetUrl)
                }}
                className="bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
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
                    alert('✅ Backend connection successful!')
                  } else {
                    alert(`❌ Backend connection failed: ${result.message}`)
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
                alert('❌ No authentication token found. Please log in first.')
              } else {
                alert('✅ Authentication token found. Token looks valid.')
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
                    alert('✅ Sync manager working!')
                  } else {
                    alert(`❌ Sync manager issue: ${result.message}`)
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
                    alert('✅ Sync manager working (no auth)!')
                  } else {
                    alert(`❌ Sync manager issue: ${JSON.stringify(result)}`)
                  }
                }).catch(error => {
                  console.error('🔧 Sync manager (no auth) error:', error)
                  alert(`❌ Sync manager error: ${error.message}`)
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
          onClick={handleClose}
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
  )
}