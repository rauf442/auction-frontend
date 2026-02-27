// frontend/src/app/internal-communication/campaigns/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { useBrand } from '@/lib/brand-context'
import * as AuctionsAPI from '@/lib/auctions-api'
import { Button } from '@/components/ui/button'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

type Audience = 'buyers' | 'sellers' | 'all'

export default function CampaignsPage() {
  const { brand } = useBrand()
  const [auctions, setAuctions] = useState<AuctionsAPI.Auction[]>([])
  const [auctionId, setAuctionId] = useState<string>('')
  const [audience, setAudience] = useState<Audience>('all')
  const [subject, setSubject] = useState('Upcoming Auction Invitation')
  const [message, setMessage] = useState('Hello {first_name},\nJoin our upcoming auction: {auction_link}')
  const [igCaption, setIgCaption] = useState('#auction #art #msaber')
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await AuctionsAPI.getAuctions({ limit: 100, sort_field: 'created_at', sort_direction: 'desc' })
        setAuctions(data.auctions || [])
      } catch (e) {
        // ignore
      }
    }
    load()
  }, [])

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)

  const postJson = async (path: string, body: any) => {
    const token = getToken()
    const resp = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    if (!resp.ok) throw new Error(await resp.text())
    return resp.json()
  }

  const sendEmail = async () => {
    setLoading(true)
    setToast(null)
    try {
      const payload = {
        brand_code: brand,
        audience,
        auction_id: auctionId || undefined,
        subject,
        text: message.replaceAll('\\n', '\n')
      }
      const res = await postJson('/api/campaigns/email', payload)
      setToast(`Email blast sent: ${res.sent} success, ${res.failed} failed`)
    } catch (e: any) {
      setToast(`Email failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const postInstagramFeed = async () => {
    setLoading(true)
    setToast(null)
    try {
      const payload = { brand_code: brand, auction_id: auctionId || undefined, caption: igCaption, num_images: 10 }
      const res = await postJson('/api/campaigns/instagram/feed', payload)
      setToast(`Instagram carousel published: ${res.media_id || 'ok'}`)
    } catch (e: any) {
      setToast(`Instagram failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const queueInstagramDMs = async () => {
    setLoading(true)
    setToast(null)
    try {
      const payload = { brand_code: brand, audience, auction_id: auctionId || undefined, message_template: message }
      const res = await postJson('/api/campaigns/instagram/dm/queue', payload)
      setToast(`Queued IG DMs: ${res.queued}`)
    } catch (e: any) {
      setToast(`Queue failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    setLoading(true)
    setToast(null)
    try {
      const email = (typeof window !== 'undefined' && localStorage.getItem('user')) ? (JSON.parse(localStorage.getItem('user') as string).email) : ''
      const payload = { brand_code: brand, to: email, subject: '[Test] Campaign Email', text: 'This is a test email.' }
      await postJson('/api/campaigns/email/test', payload)
      setToast('Test email sent (check your inbox).')
    } catch (e: any) {
      setToast(`Test email failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const previewInstagram = async () => {
    setLoadingPreview(true)
    setToast(null)
    try {
      const payload = { brand_code: brand, auction_id: auctionId || undefined, num_images: 10 }
      const res = await postJson('/api/campaigns/instagram/feed/preview', payload)
      setToast(`IG Preview: ${res.images?.length || 0} images selected`)
    } catch (e: any) {
      setToast(`IG preview failed: ${e.message}`)
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border rounded-lg p-4">
        <h1 className="text-xl font-semibold">Bulk Campaigns</h1>
        <p className="text-sm text-gray-500">Send emails and Instagram posts/DMs to clients</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Audience</label>
            <select className="border rounded px-3 py-2 w-full" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="all">All</option>
              <option value="buyers">Buyers</option>
              <option value="sellers">Sellers</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Auction (optional)</label>
            <select className="border rounded px-3 py-2 w-full" value={auctionId} onChange={(e) => setAuctionId(e.target.value)}>
              <option value="">None</option>
              {auctions.map((a) => (
                <option key={a.id} value={a.id}>{a.short_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject (email)</label>
            <input className="border rounded px-3 py-2 w-full" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea className="border rounded px-3 py-2 w-full" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1">Tokens: {'{first_name}'} {'{auction_link}'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Instagram Caption</label>
          <input className="border rounded px-3 py-2 w-full" value={igCaption} onChange={(e) => setIgCaption(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <Button onClick={sendEmail} disabled={loading}>Send Email</Button>
          <Button onClick={sendTestEmail} disabled={loading} variant="secondary">Send Test Email</Button>
          <Button onClick={postInstagramFeed} disabled={loading} variant="outline">Post Instagram (10 images)</Button>
          <Button onClick={queueInstagramDMs} disabled={loading} variant="outline">Queue IG DMs</Button>
          <Button onClick={previewInstagram} disabled={loadingPreview} variant="secondary">Preview IG</Button>
        </div>

        {toast && (<div className="mt-3 text-sm text-gray-700">{toast}</div>)}
      </div>
    </div>
  )
}


