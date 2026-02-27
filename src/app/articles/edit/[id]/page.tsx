// frontend/admin/src/app/articles/edit/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ArticleForm from '@/components/articles/ArticleForm'

export default function EditArticlePage() {
  const router = useRouter()
  const params = useParams()
  const articleId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [article, setArticle] = useState<any>(null)

  useEffect(() => {
    loadArticle()
  }, [articleId])

  const loadArticle = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${articleId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (data.success) {
        setArticle(data.data)
      } else {
        setError(data.message || 'Failed to load article')
      }

    } catch (err: any) {
      console.error('Error loading article:', err)
      setError(err.message || 'Failed to load article')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    router.push('/articles')
  }

  const handleCancel = () => {
    router.push('/articles')
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Article</h1>
      <ArticleForm 
        mode="edit"
        articleId={parseInt(articleId)}
        initialData={article}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

