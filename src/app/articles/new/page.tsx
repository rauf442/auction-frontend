// frontend/admin/src/app/articles/new/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ArticleForm from '@/components/articles/ArticleForm'

export default function NewArticlePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [initialBrandId, setInitialBrandId] = useState<string>('')
  
  useEffect(() => {
    const brandIdParam = searchParams.get('brand_id')
    if (brandIdParam) {
      setInitialBrandId(brandIdParam)
    }
  }, [searchParams])

  const handleSuccess = () => {
    const brandParam = searchParams.get('brand')
    if (brandParam) {
      router.push(`/website/${brandParam.toLowerCase()}`)
    } else {
      router.push('/articles')
    }
  }

  const handleCancel = () => {
    const brandParam = searchParams.get('brand')
    if (brandParam) {
      router.push(`/website/${brandParam.toLowerCase()}`)
    } else {
      router.push('/articles')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Article</h1>
      <ArticleForm 
        mode="create"
        initialBrandId={initialBrandId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

