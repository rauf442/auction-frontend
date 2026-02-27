"use client"

import React from 'react'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
      </div>

      {/* Page Content */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">
            Please select a report from the menu.
          </h2>
        </div>
      </div>
    </div>
  )
} 