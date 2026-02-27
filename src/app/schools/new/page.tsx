// frontend/src/app/schools/new/page.tsx
"use client"

import SchoolForm from '@/components/schools/SchoolForm'

export default function NewSchoolPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New School</h1>
          <p className="text-gray-600">Create a new school profile with AI-powered content generation</p>
        </div>
      </div>
      
      <SchoolForm />
    </div>
  )
} 