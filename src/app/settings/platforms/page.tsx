// frontend/src/app/settings/platforms/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import XeroConfiguration from '@/components/settings/XeroConfiguration'

type Brand = { id: string; code: string; name: string }
type PlatformCredential = { id: string; brand_id: string; platform: string; key_id?: string; secret_value?: string; additional?: any; is_active: boolean; brands?: { code: string; name: string } }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export default function PlatformSettingsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('MSABER')
  const [platforms, setPlatforms] = useState<PlatformCredential[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE_URL}/brands`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) setBrands(data.data)
  }

  const fetchCredentials = async (brandCode: string) => {
    const token = localStorage.getItem('token')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/platform-credentials?brand_code=${encodeURIComponent(brandCode)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load credentials')
      const data = await res.json()
      setPlatforms(data.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBrands() }, [])
  useEffect(() => { if (selectedBrand) fetchCredentials(selectedBrand) }, [selectedBrand])

  const handleSave = async (platform: string, key_id?: string, secret_value?: string, additional?: any, is_active?: boolean) => {
    const token = localStorage.getItem('token')
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/platform-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brand_code: selectedBrand, platform, key_id, secret_value, additional, is_active })
      })
      if (!res.ok) throw new Error('Failed to save credentials')
      await fetchCredentials(selectedBrand)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const testPlatform = async (platform: string) => {
    const token = localStorage.getItem('token')
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/platform-credentials/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brand_code: selectedBrand, platform })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test failed')
      alert(`${platform} OK: ${data.message || 'success'}`)
    } catch (e: any) {
      alert(`${platform} failed: ${e.message}`)
    }
  }

  const ensurePlatform = (platform: string) => platforms.find(p => p.platform === platform) || { platform, key_id: '', secret_value: '', is_active: true, additional: {} }

  const rows = [
    { label: 'Email SMTP', key: 'email_smtp' },
    { label: 'Instagram', key: 'instagram' },
    { label: 'Xero Accounting', key: 'xero' },
    { label: 'LiveAuctioneers (FTP Upload)', key: 'LIVE_AUCTIONEERS' },
    { label: 'Easy Live Auction', key: 'EASY_LIVE' },
    { label: 'Invaluable', key: 'INVALUABLE' },
    { label: 'The Saleroom', key: 'THE_SALEROOM' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Platform Credentials</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Brand</label>
          <select className="border rounded px-3 py-1" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
            {brands.map(b => (
              <option key={b.id} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white p-6">
        {error && <div className="mb-4 text-red-600">{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            {rows.map(r => {
              const creds = ensurePlatform(r.key) as PlatformCredential
              const smtpExtra = (creds.additional || {}) as { host?: string; port?: number; secure?: boolean; from?: string }

              // Special handling for Xero - use OAuth component
              if (r.key === 'xero') {
                const selectedBrandData = brands.find(b => b.code === selectedBrand)
                return (
                  <div key={r.key} className="border rounded-lg p-4">
                    <XeroConfiguration
                      brandId={selectedBrandData?.id || ''}
                      brandName={selectedBrandData?.name || selectedBrand}
                      selectedBrand={selectedBrand}
                    />
                  </div>
                )
              }

              return (
                <div key={r.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{r.label}</h3>
                    <label className="flex items-center space-x-2 text-sm">
                      <span>Active</span>
                      <input type="checkbox" defaultChecked={!!creds.is_active} onChange={(e) => handleSave(r.key, creds.key_id, creds.secret_value, creds.additional, e.target.checked)} />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Key / Client ID</label>
                      <input className="w-full border rounded px-3 py-2" defaultValue={creds.key_id || ''} onBlur={(e) => handleSave(r.key, e.target.value, creds.secret_value, creds.additional, creds.is_active)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Secret / Token</label>
                      <input className="w-full border rounded px-3 py-2" type="password" placeholder={creds.secret_value ? '••••••••' : ''} onBlur={(e) => handleSave(r.key, creds.key_id, e.target.value, creds.additional, creds.is_active)} />
                    </div>
                  </div>
                  <div className="mt-3">
                    {r.key === 'email_smtp' && (
                      <button className="text-sm px-3 py-1 border rounded" onClick={() => testPlatform('email_smtp')}>Test SMTP</button>
                    )}
                    {r.key === 'instagram' && (
                      <button className="text-sm px-3 py-1 border rounded" onClick={() => testPlatform('instagram')}>Test Instagram</button>
                    )}
                    {r.key === 'LIVE_AUCTIONEERS' && (
                      <p className="text-xs text-gray-500 mt-2">Use your FTP username/password from the LiveAuctioneers seller portal. We will use these for bulk image uploads.</p>
                    )}
                  </div>

                  {r.key === 'email_smtp' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Host</label>
                        <input
                          className="w-full border rounded px-3 py-2"
                          defaultValue={smtpExtra.host || ''}
                          onBlur={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...smtpExtra, host: e.target.value }, creds.is_active)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Port</label>
                        <input
                          className="w-full border rounded px-3 py-2"
                          type="number"
                          defaultValue={smtpExtra.port || 587}
                          onBlur={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...smtpExtra, port: Number(e.target.value || 587) }, creds.is_active)}
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="inline-flex items-center space-x-2 w-full">
                          <input
                            type="checkbox"
                            defaultChecked={!!smtpExtra.secure}
                            onChange={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...smtpExtra, secure: e.target.checked }, creds.is_active)}
                          />
                          <span className="text-sm text-gray-600">Secure (TLS)</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">From Email</label>
                        <input
                          className="w-full border rounded px-3 py-2"
                          defaultValue={smtpExtra.from || ''}
                          placeholder="noreply@example.com"
                          onBlur={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...smtpExtra, from: e.target.value }, creds.is_active)}
                        />
                      </div>
                    </div>
                  )}

                {r.key === 'LIVE_AUCTIONEERS' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">FTP Host</label>
                      <input
                        className="w-full border rounded px-3 py-2"
                        defaultValue={(creds.additional || {}).host || ''}
                        placeholder="ftp.liveauctioneers.com"
                        onBlur={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...(creds.additional || {}), host: e.target.value }, creds.is_active)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Base Directory</label>
                      <input
                        className="w-full border rounded px-3 py-2"
                        defaultValue={(creds.additional || {}).base_dir || ''}
                        placeholder="/"
                        onBlur={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...(creds.additional || {}), base_dir: e.target.value }, creds.is_active)}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center space-x-2">
                        <input
                          type="checkbox"
                          defaultChecked={!!(creds.additional || {}).secure}
                          onChange={(e) => handleSave(r.key, creds.key_id, creds.secret_value, { ...(creds.additional || {}), secure: e.target.checked }, creds.is_active)}
                        />
                        <span className="text-sm text-gray-600">Secure (TLS)</span>
                      </label>
                    </div>
                  </div>
                )}

                  {r.key === 'instagram' && (
                    <p className="text-xs text-gray-500 mt-2">Key = Instagram User ID, Secret = Long‑lived Access Token</p>
                  )}
                </div>
              )
            })}
          </div>
        )}


      </div>
    </div>
  )
}


