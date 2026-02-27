"use client"

export default function SettingsTagsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      {/* Secondary Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Tags</h2>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-6">
        <div className="text-gray-500 text-center">
          Tags configuration coming soon...
        </div>
      </div>
    </div>
  )
} 