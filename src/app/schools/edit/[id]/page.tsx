// frontend/src/app/schools/edit/[id]/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import SchoolForm from '@/components/schools/SchoolForm'
import { School, SchoolsAPI } from '@/lib/schools-api'

export default function EditSchoolPage() {
  const params = useParams()
  const router = useRouter()
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const schoolId = params?.id as string

  useEffect(() => {
    const fetchSchool = async () => {
      if (!schoolId) {
        setError('School ID not found')
        setLoading(false)
        return
      }

      try {
        const response = await SchoolsAPI.getSchool(schoolId)
        if (response.success) {
          setSchool(response.data)
        } else {
          setError('School not found')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load school')
      } finally {
        setLoading(false)
      }
    }

    fetchSchool()
  }, [schoolId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading school...</p>
        </div>
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading School</h2>
          <p className="text-gray-600 mb-4">{error || 'School not found'}</p>
          <button
            onClick={() => router.push('/schools')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Schools
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit School</h1>
          <p className="text-gray-600">Update {school.name}'s information</p>
        </div>
      </div>
      
      <SchoolForm school={school} isEditing={true} />
    </div>
  )
} 