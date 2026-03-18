// frontend/admin/src/components/website/WebsiteManagement.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { ExternalLink, Share2, ArrowLeft, FileText, Plus, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface WebsiteManagementProps {
  brandName: string
  brandInitial: string
  brandCode: string
  brandId: number
  envVar: string
  fallbackUrl: string
  gradientFrom: string
  gradientTo: string
  primaryColor: string
  primaryColorHover: string
  accentColor: string
  accentColorLight: string
  accentColorDark: string
}

interface Article {
  id: number
  title: string
  slug: string
  status: string
  published_at: string | null
  views_count: number
  category: string | null
  featured: boolean
}

export default function WebsiteManagement({
  brandName,
  brandInitial,
  brandCode,
  brandId,
  envVar,
  fallbackUrl,
  gradientFrom,
  gradientTo,
  primaryColor,
  primaryColorHover,
  accentColor,
  accentColorLight,
  accentColorDark
}: WebsiteManagementProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showArticles, setShowArticles] = useState(true)
  const [brandLogo, setBrandLogo] = useState<string>('')

  useEffect(() => {
    loadArticles()
    loadBrandInfo()
  }, [brandId])

  const loadBrandInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/brands/${brandId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.logo_url) {
          setBrandLogo(data.data.logo_url)
        }
      }
    } catch (err) {
      console.error('Error loading brand info:', err)
    }
  }

  const loadArticles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/articles?brand_id=${brandId}&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setArticles(data.data || [])
        }
      }
    } catch (err) {
      console.error('Error loading articles:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArticle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()
      if (data.success) {
        toast.success('Article deleted successfully')
        loadArticles()
      } else {
        toast.error(data.message || 'Failed to delete article')
      }
    } catch (err: any) {
      console.error('Error deleting article:', err)
      toast.error('Failed to delete article: ' + err.message)
    }
  }

  const getBaseUrl = () => {
    // Direct access to environment variables for proper Next.js client-side resolution
    if (envVar === 'NEXT_PUBLIC_FRONTEND_URL_AURUM') {
      return process.env.NEXT_PUBLIC_FRONTEND_URL_AURUM || fallbackUrl
    }
    if (envVar === 'NEXT_PUBLIC_FRONTEND_URL_METSAB') {
      return process.env.NEXT_PUBLIC_FRONTEND_URL_METSAB || fallbackUrl
    }
    return fallbackUrl
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleOpenWebsite = () => {
    const url = getBaseUrl()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShareWebsite = async () => {
    const url = getBaseUrl()
    const title = `${brandName} Auction House`

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Discover fine art and collectibles at ${brandName} Auction House`,
          url
        })
      } catch (error) {
        // Handle user canceling the share dialog (AbortError) or other share errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error)
          // Fallback to clipboard copy
          try {
            await navigator.clipboard.writeText(url)
            toast.success(`Link copied to clipboard: ${url}`)
          } catch (clipboardError) {
            console.error('Clipboard copy failed:', clipboardError)
            toast.error(`Share failed. URL: ${url}`)
          }
        }
        // If it's AbortError (user canceled), we silently continue
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success(`Link copied to clipboard: ${url}`)
      } catch (clipboardError) {
        console.error('Clipboard copy failed:', clipboardError)
        toast.error(`Share failed. URL: ${url}`)
      }
    }
  }

  const baseUrl = getBaseUrl()
  const publishedCount = articles.filter((article) => article.status === 'published').length
  const draftCount = articles.filter((article) => article.status !== 'published').length
  const featuredCount = articles.filter((article) => article.featured).length
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-900">{brandName} website</span>
        </div>

        <section className={cn("mt-6 rounded-3xl p-8 text-white shadow-lg bg-gradient-to-br", gradientFrom, gradientTo)}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              {brandLogo ? (
                <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                  <img src={brandLogo} alt={`${brandName} logo`} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {brandInitial}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Public site</p>
                <h1 className="text-3xl font-semibold">{brandName} digital showcase</h1>
                <p className={cn("text-sm text-white/80", accentColor)}>{brandCode} · {envVar}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm sm:flex-row">
              <button
                onClick={handleOpenWebsite}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open website
              </button>
              <button
                onClick={handleShareWebsite}
                className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-5 py-3 font-semibold text-white/90 transition hover:bg-white/10"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share link
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-3">
            <div>
              <p className="uppercase text-[11px] tracking-[0.3em]">Live URL</p>
              <p className="mt-1 text-base font-semibold break-all">{baseUrl}</p>
            </div>
            <div>
              <p className="uppercase text-[11px] tracking-[0.3em]">Articles published</p>
              <p className="mt-1 text-base font-semibold">{publishedCount}</p>
            </div>
            <div>
              <p className="uppercase text-[11px] tracking-[0.3em]">Featured stories</p>
              <p className="mt-1 text-base font-semibold">{featuredCount}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Connection details</h3>
              <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", accentColorLight, accentColorDark)}>
                {brandCode}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Environment variable</p>
            <p className={cn("text-sm font-mono text-slate-800", accentColorDark)}>{envVar}</p>
            <p className="mt-4 text-sm text-slate-500">Fallback URL</p>
            <p className="text-sm font-mono text-slate-800 break-all">{fallbackUrl}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Content overview</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Published</p>
                <p className="text-2xl font-semibold text-slate-900">{publishedCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Drafts</p>
                <p className="text-2xl font-semibold text-slate-900">{draftCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Featured</p>
                <p className="text-2xl font-semibold text-slate-900">{featuredCount}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">Keep featured stories fresh to showcase brand narratives.</p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-500" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">News, views & insights</h3>
                <p className="text-sm text-slate-500">Manage editorial content surfaced on the public site.</p>
              </div>
            </div>
            <Link
              href={`/articles/new?brand=${brandCode}&brand_id=${brandId}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition",
                primaryColor,
                primaryColorHover
              )}
            >
              <Plus className="h-4 w-4" />
              New article
            </Link>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-10 text-slate-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">No articles yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div key={article.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition hover:border-slate-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-slate-900">{article.title}</h4>
                          {article.featured && (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">Featured</span>
                          )}
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            article.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                            article.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {article.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          {article.category && <span>{article.category}</span>}
                          <span>Published: {formatDate(article.published_at)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views_count || 0} views
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-4">
                        <a
                          href={`${baseUrl}/news/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900"
                          title="View on website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/articles/edit/${article.id}`}
                          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900"
                          title="Edit article"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="rounded-full border border-slate-200 p-2 text-rose-500 transition hover:text-rose-600"
                          title="Delete article"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}


