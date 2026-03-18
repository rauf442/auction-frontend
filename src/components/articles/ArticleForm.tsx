// frontend/admin/src/components/articles/ArticleForm.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { Save, X, Eye, Upload, Image as ImageIcon } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

interface ArticleFormProps {
  mode: 'create' | 'edit'
  articleId?: number
  initialData?: any
  initialBrandId?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function ArticleForm({
  mode,
  articleId,
  initialData,
  initialBrandId,
  onSuccess,
  onCancel
}: ArticleFormProps) {
  const { brand } = useBrand()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [brands, setBrands] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author_name: '',
    author_title: '',
    cover_image_url: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    published_at: '',
    brand_id: initialBrandId || '',
    category: '',
    tags: [] as string[],
    featured: false,
    seo_title: '',
    seo_description: '',
    seo_keywords: [] as string[]
  })

  // Update brand_id when initialBrandId changes
  useEffect(() => {
    if (initialBrandId && !formData.brand_id) {
      setFormData(prev => ({ ...prev, brand_id: initialBrandId }))
    }
  }, [initialBrandId])

  const [tagInput, setTagInput] = useState('')
  const [seoKeywordInput, setSeoKeywordInput] = useState('')

  useEffect(() => {
    loadBrands()
  }, [])

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        slug: initialData.slug || '',
        excerpt: initialData.excerpt || '',
        content: initialData.content || '',
        author_name: initialData.author_name || '',
        author_title: initialData.author_title || '',
        cover_image_url: initialData.cover_image_url || '',
        status: initialData.status || 'draft',
        published_at: initialData.published_at ? new Date(initialData.published_at).toISOString().slice(0, 16) : '',
        brand_id: initialData.brand_id?.toString() || '',
        category: initialData.category || '',
        tags: initialData.tags || [],
        featured: initialData.featured || false,
        seo_title: initialData.seo_title || '',
        seo_description: initialData.seo_description || '',
        seo_keywords: initialData.seo_keywords || []
      })
    }
  }, [initialData])

  const loadBrands = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/brands`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBrands(data.data || [])
        }
      }
    } catch (err) {
      console.error('Error loading brands:', err)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      // Auto-generate slug only in create mode and if slug is empty
      ...(mode === 'create' && !prev.slug ? { slug: generateSlug(title) } : {})
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      const token = localStorage.getItem('token')
      const uploadFormData = new FormData()
      uploadFormData.append('image', file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      })

      const data = await response.json()

      if (data.success && data.url) {
        setFormData(prev => ({ ...prev, cover_image_url: data.url }))
      } else {
        toast.error('Failed to upload image: ' + (data.message || 'Unknown error'))
      }

    } catch (err: any) {
      console.error('Error uploading image:', err)
      toast.error('Failed to upload image: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const addSeoKeyword = () => {
    if (seoKeywordInput.trim() && !formData.seo_keywords.includes(seoKeywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        seo_keywords: [...prev.seo_keywords, seoKeywordInput.trim()]
      }))
      setSeoKeywordInput('')
    }
  }

  const removeSeoKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      seo_keywords: prev.seo_keywords.filter(k => k !== keyword)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.slug || !formData.content) {
      toast.warning('Please fill in all required fields (Title, Slug, and Content)')
      return
    }

    try {
      setLoading(true)

      const token = localStorage.getItem('token')
      const url = mode === 'create'
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/articles`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}`

      const payload = {
        ...formData,
        brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
        published_at: formData.published_at || null
      }

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Article ${mode === 'create' ? 'created' : 'updated'} successfully!`)
        onSuccess()
      } else {
        toast.error(data.message || `Failed to ${mode} article`)
      }

    } catch (err: any) {
      console.error(`Error ${mode}ing article:`, err)
      toast.error(`Failed to ${mode} article: ` + err.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Basic Information</h2>
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter article title"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="article-url-slug"
          />
          <p className="text-xs text-gray-500 mt-1">URL-friendly version of the title</p>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Excerpt
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief summary of the article"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            required
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Write your article content here (HTML supported)"
          />
          <p className="text-xs text-gray-500 mt-1">You can use HTML tags for formatting</p>
        </div>
      </div>

      {/* Publishing Details */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Publishing Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Published At */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Published Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.published_at}
              onChange={(e) => setFormData(prev => ({ ...prev, published_at: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Brands</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Announcements, Market Insights"
            />
          </div>
        </div>

        {/* Featured Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured}
            onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="featured" className="text-sm font-medium text-gray-700">
            Mark as Featured Article
          </label>
        </div>
      </div>

      {/* Author Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Author Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author Name
            </label>
            <input
              type="text"
              value={formData.author_name}
              onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author Title
            </label>
            <input
              type="text"
              value={formData.author_title}
              onChange={(e) => setFormData(prev => ({ ...prev, author_title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Art Specialist"
            />
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Cover Image</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Image URL
          </label>
          
          {formData.cover_image_url && (
            <div className="mb-4">
              <img
                src={formData.cover_image_url}
                alt="Cover preview"
                className="w-full max-w-md h-48 object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.cover_image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Tags</h2>
        
        <div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SEO */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">SEO Settings</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SEO Title
          </label>
          <input
            type="text"
            value={formData.seo_title}
            onChange={(e) => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optimized title for search engines"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SEO Description
          </label>
          <textarea
            value={formData.seo_description}
            onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Meta description for search engines"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SEO Keywords
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={seoKeywordInput}
              onChange={(e) => setSeoKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSeoKeyword())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add SEO keyword and press Enter"
            />
            <button
              type="button"
              onClick={addSeoKeyword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.seo_keywords.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeSeoKeyword(keyword)}
                  className="hover:text-green-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : mode === 'create' ? 'Create Article' : 'Update Article'}
        </button>
      </div>
    </form>
  )
}

