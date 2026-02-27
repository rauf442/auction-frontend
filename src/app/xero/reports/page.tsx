// frontend/admin/src/app/xero/reports/page.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import BrandSelector from '@/components/xero/BrandSelector'
import { getXeroReports } from '@/lib/xero-payments-api'
import { BarChart3, AlertCircle, RefreshCw, Calendar, Download, FileText, TrendingUp, TrendingDown } from 'lucide-react'

interface ReportData {
  reportName: string
  reportType: string
  reportTitles: string[]
  reportDate: string
  updatedDateUTC: string
  rows?: any[]
}

const REPORT_TYPES = [
  {
    id: 'BalanceSheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities and equity at a point in time',
    icon: BarChart3,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'ProfitAndLoss',
    name: 'Profit & Loss',
    description: 'Revenue and expenses over a period',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'TrialBalance',
    name: 'Trial Balance',
    description: 'List of all accounts with balances',
    icon: FileText,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'AgedReceivables',
    name: 'Aged Receivables',
    description: 'Outstanding customer invoices by age',
    icon: TrendingDown,
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'AgedPayables',
    name: 'Aged Payables',
    description: 'Outstanding supplier bills by age',
    icon: TrendingDown,
    color: 'bg-red-100 text-red-800'
  }
]

export default function XeroReportsPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportOptions, setReportOptions] = useState({
    date: new Date().toISOString().split('T')[0],
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    toDate: new Date().toISOString().split('T')[0],
    periods: '12',
    timeframe: 'MONTH'
  })

  const fetchReport = async (reportType: string, options?: any) => {
    if (!selectedBrandId) return

    try {
      setLoading(true)
      setError(null)
      setSelectedReportType(reportType)
      
      const response = await getXeroReports(selectedBrandId, reportType, options)
      
      if (response.success && response.reports && response.reports.length > 0) {
        setReportData(response.reports[0])
      } else {
        setError('Failed to fetch report data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching report')
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReportSelect = (reportType: string) => {
    const options = { ...reportOptions }
    
    // Customize options based on report type
    switch (reportType) {
      case 'BalanceSheet':
      case 'TrialBalance':
        fetchReport(reportType, { date: options.date })
        break
      case 'ProfitAndLoss':
        fetchReport(reportType, {
          fromDate: options.fromDate,
          toDate: options.toDate,
          periods: options.periods,
          timeframe: options.timeframe
        })
        break
      case 'AgedReceivables':
      case 'AgedPayables':
        fetchReport(reportType, { date: options.date })
        break
      default:
        fetchReport(reportType, options)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderReportData = (data: ReportData) => {
    if (!data.rows || data.rows.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">This report contains no data for the selected period.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Report Header */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900">{data.reportName}</h3>
          {data.reportTitles && data.reportTitles.length > 0 && (
            <div className="mt-2">
              {data.reportTitles.map((title, index) => (
                <p key={index} className="text-sm text-gray-600">{title}</p>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Generated on {formatDate(data.updatedDateUTC)}
          </p>
        </div>

        {/* Report Data - Simplified display */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-4">Report Data</h4>
            <div className="text-sm text-gray-600">
              <p>This report contains {data.rows.length} rows of data.</p>
              <p className="mt-2 text-xs text-gray-500">
                Note: Detailed report data display is available. The raw data structure can be processed to show formatted tables with accounts, balances, and other financial information.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          Xero Reports
        </h1>
        <p className="text-gray-600">Generate and view financial reports from your Xero account</p>
      </div>

      <div className="grid gap-6">
        {/* Brand Selector */}
        <BrandSelector
          selectedBrandId={selectedBrandId}
          onBrandSelect={setSelectedBrandId}
        />

        {/* Report Options */}
        {selectedBrandId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Report Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reportOptions.date}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={reportOptions.fromDate}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, fromDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={reportOptions.toDate}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, toDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeframe
                  </label>
                  <select
                    value={reportOptions.timeframe}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, timeframe: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MONTH">Month</option>
                    <option value="QUARTER">Quarter</option>
                    <option value="YEAR">Year</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Types */}
        {selectedBrandId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Available Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORT_TYPES.map((report) => {
                  const IconComponent = report.icon
                  return (
                    <button
                      key={report.id}
                      onClick={() => handleReportSelect(report.id)}
                      disabled={loading}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${report.color}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{report.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          {selectedReportType === report.id && loading && (
                            <div className="flex items-center gap-2 mt-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm text-blue-600">Generating...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Data */}
        {selectedBrandId && (selectedReportType || error) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Report Results
                </CardTitle>
                {reportData && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {REPORT_TYPES.find(r => r.id === selectedReportType)?.name}
                    </Badge>
                    <button className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Generating report...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              )}

              {!loading && !error && reportData && renderReportData(reportData)}

              {!loading && !error && !reportData && selectedReportType && (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
                  <p className="text-gray-600">No data available for the selected report.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
