"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus, Filter, RefreshCw, Eye } from 'lucide-react'

export default function ValuationsPage() {
  const [filters, setFilters] = useState({
    type: 'Upcoming',
    valuationRegion: '',
    valuationLocation: '',
    country: '',
    region: '',
    city: ''
  })

  const [showFilter, setShowFilter] = useState(true)

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetFilter = () => {
    setFilters({
      type: 'Upcoming',
      valuationRegion: '',
      valuationLocation: '',
      country: '',
      region: '',
      city: ''
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Valuation Days</h1>
        <Link
          href="/valuations/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Valuation Day</span>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Filters Section */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type:</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Past">Past</option>
                <option value="All">All</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuation Region</label>
              <select
                value={filters.valuationRegion}
                onChange={(e) => handleFilterChange('valuationRegion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Choose</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuation Location</label>
              <select
                value={filters.valuationLocation}
                onChange={(e) => handleFilterChange('valuationLocation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Choose</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Choose</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2 md:col-span-4 flex items-end space-x-3">
              <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
              <button 
                onClick={resetFilter}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Actions */}
        <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center space-x-1"
            >
              <Filter className="h-4 w-4" />
              <span>Show filter</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Show/Hide</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date and time ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  V.Region ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PPC Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booked ⓘ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center space-y-2">
                    <Eye className="h-8 w-8 text-gray-300" />
                    <span>No items found. You can reset the filter <a href="#" className="text-teal-600 hover:text-teal-700">here</a>.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">( Items: 0 - 0 from 0 )</span>
            <div className="flex items-center space-x-4">
              <select className="border border-gray-300 rounded text-sm px-2 py-1">
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 