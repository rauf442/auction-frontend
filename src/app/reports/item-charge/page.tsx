"use client"

import React from 'react'
import { FileText } from 'lucide-react'

export default function ItemChargeReportPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Item Charge Report</h1>
      </div>

      {/* Page Content */}
      <div className="flex-1 bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FileText className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Item Charge Report</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-gray-900 mb-2">Report Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option>Last 30 days</option>
                      <option>Last 90 days</option>
                      <option>This year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auction</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option>All Auctions</option>
                      <option>First Timed Auction</option>
                      <option>First Live Auction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option>All Items</option>
                      <option>Sold</option>
                      <option>Unsold</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md transition-colors">
                    Generate Report
                  </button>
                </div>
              </div>
              
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Configure filters and click "Generate Report" to view item charge data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 