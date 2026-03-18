"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Package, Gavel, DollarSign, Building } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getDashboardStats, getRecentAuctions, getTopLots, getTopBuyers, getTopVendors, DashboardStats } from '@/lib/dashboard-api'
import { getBrands, Brand } from '@/lib/brands-api'

export default function DashboardPage() {
  // Set default to last 30 days
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaultDates.from)
  const [dateTo, setDateTo] = useState(defaultDates.to)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Date range selection state
  const [selectedDateRange, setSelectedDateRange] = useState<string>('last30days')

  // Brand selection state
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
  const [brandsLoading, setBrandsLoading] = useState(false)

  // Load brands on component mount
  useEffect(() => {
    loadBrands()
  }, [])

  // Calculate dates based on selected range
  const getDatesForRange = (range: string) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];

    switch (range) {
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return { from: sevenDaysAgo.toISOString().split('T')[0], to };
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return { from: thirtyDaysAgo.toISOString().split('T')[0], to };
      case 'lastyear':
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        return { from: oneYearAgo.toISOString().split('T')[0], to };
      case 'last2years':
        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(today.getFullYear() - 2);
        return { from: twoYearsAgo.toISOString().split('T')[0], to };
      case 'custom':
        return { from: dateFrom, to: dateTo };
      default:
        return getDefaultDates();
    }
  };

  // Update dates when range changes
  useEffect(() => {
    if (selectedDateRange !== 'custom') {
      const newDates = getDatesForRange(selectedDateRange);
      setDateFrom(newDates.from);
      setDateTo(newDates.to);
    }
  }, [selectedDateRange]);

  // Load dashboard data when filters change
  useEffect(() => {
    loadDashboardData()
  }, [dateFrom, dateTo, selectedBrandId])

  const loadBrands = async () => {
    try {
      setBrandsLoading(true)
      const response = await getBrands()
      if (response.success) {
        setBrands(response.data)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    } finally {
      setBrandsLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get selected brand code or null for 'all' (explicitly request all brands)
      const brandCode = selectedBrandId === 'all' ? null : brands.find(b => b.id.toString() === selectedBrandId)?.code

      const data = await getDashboardStats(dateFrom || undefined, dateTo || undefined, brandCode)
      setStats(data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading dashboard</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const dateRangeLabel = dateFrom && dateTo
    ? `${new Date(dateFrom).toLocaleDateString()} – ${new Date(dateTo).toLocaleDateString()}`
    : 'Live data range'

  // Calculate donut chart values
  const soldPercentage = stats.lots.soldPercentage
  const soldInAuctionPerc = stats.lots.totalLots > 0 ? (stats.lots.soldInAuction / stats.lots.totalLots) * 100 : 0
  const soldAfterwardsPerc = stats.lots.totalLots > 0 ? (stats.lots.soldAfterwards / stats.lots.totalLots) * 100 : 0
  const unsoldPercentage = 100 - soldPercentage

  // Donut chart calculations
  const circumference = 2 * Math.PI * 35
  const soldOffset = circumference * (1 - soldInAuctionPerc / 100)
  const afterSalesOffset = circumference * (1 - (soldInAuctionPerc + soldAfterwardsPerc) / 100)

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="space-y-8 px-6 py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Operations Pulse</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Command overview</h1>
              <p className="text-sm text-slate-500">{dateRangeLabel}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="bg-transparent text-slate-900 focus:outline-none"
                >
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="lastyear">Last Year</option>
                  <option value="last2years">Last 2 Years</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <Building className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  disabled={brandsLoading}
                  className="bg-transparent text-slate-900 focus:outline-none disabled:opacity-60"
                >
                  <option value="all">All brands</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id.toString()}>
                      {brand.name} ({brand.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedDateRange === 'custom' && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Gavel className="h-5 w-5 text-blue-600" />}
            label="Total auctions"
            value={stats.auctions.total.toString()}
            trend="Live schedules synced"
          />
          <MetricCard
            icon={<Package className="h-5 w-5 text-emerald-600" />}
            label="Total lots"
            value={stats.lots.totalLots.toLocaleString()}
            trend={`${stats.lots.totalSold} sold`}
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-cyan-600" />}
            label="Sold rate"
            value={`${soldPercentage}%`}
            trend={`${stats.lots.soldInAuction} in-room`}
          />
          <MetricCard
            icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
            label="Revenue"
            value={formatCurrency(stats.revenue.totalRevenue)}
            trend={`${formatCurrency(stats.revenue.buyerPremium)} buyer fees`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pipeline</p>
                <h3 className="text-lg font-semibold text-slate-900">Recent auctions</h3>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {stats.recentAuctions.length > 0 ? (
                stats.recentAuctions.slice(0, 6).map((auction) => (
                  <div key={auction.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{auction.short_name}</p>
                      <p className="text-xs text-slate-500">{auction.status}</p>
                    </div>
                    <p className="text-sm text-slate-500">
                      {new Date(auction.start_date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 py-6 text-center text-sm text-slate-500">
                  No auctions found
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Performance</p>
                <h3 className="text-lg font-semibold text-slate-900">Lots sold split</h3>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center">
              {/* Donut Chart */}
              <div className="relative mb-4 h-48 w-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="10"
                  />
                  {/* Sold in auction */}
                  {soldInAuctionPerc > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="#14B8A6"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={soldOffset}
                    />
                  )}
                  {/* Sold afterwards */}
                  {soldAfterwardsPerc > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={afterSalesOffset}
                    />
                  )}
                  {/* Unsold */}
                  {unsoldPercentage > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={0}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">{soldPercentage}%</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center space-x-4 text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span>Sold</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Aftersales</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Unsold</span>
                </div>
              </div>

              {/* Stats */}
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Sold</span>
                  <span className="text-teal-600 font-medium">{stats.lots.totalSold} / {stats.lots.totalLots}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sold In Auction</span>
                  <span>{stats.lots.soldInAuction}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sold In Aftersale</span>
                  <span>{stats.lots.soldAfterwards}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unsold</span>
                  <span>{stats.lots.unsold}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatStack
            title="Value overview"
            items={[
              { label: 'Low estimate', value: formatCurrency(stats.values.totalLowEstimate) },
              { label: 'High estimate', value: formatCurrency(stats.values.totalHighEstimate) },
              { label: 'Hammer + commission', value: formatCurrency(stats.values.totalHammerWithCommission) },
            ]}
          />
          <StatStack
            title="Buyer stats"
            items={[
              { label: 'Registered buyers', value: stats.buyers.totalBuyers.toString() },
              { label: 'Active bidders', value: stats.buyers.totalBidders.toString() },
              { label: 'Total bids', value: stats.buyers.totalBids.toString() },
            ]}
          />
          <StatStack
            title="Vendor stats"
            items={[
              { label: 'Vendors', value: stats.vendors.totalVendors.toString() },
              { label: 'Consignments', value: stats.vendors.totalConsignments.toString() },
              { label: 'Lots consigned', value: stats.lots.totalLots.toString() },
            ]}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total revenue</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(stats.revenue.totalRevenue)}</p>
            <p className="mt-1 text-xs text-slate-500">Buyer + vendor income</p>
          </div>
          <TopList title="Top 5 lots" items={stats.topLots.map((lot) => ({
            name: `${lot.auction_name} / ${lot.lot_number}`,
            value: formatCurrency(lot.hammer_price),
          }))} emptyLabel="No sold lots" />
          <TopList title="Top 5 buyers" items={stats.topBuyers.map((buyer) => ({
            name: buyer.name,
            value: formatCurrency(buyer.total_spent),
          }))} emptyLabel="No buyer data" />
          <TopList title="Top 5 vendors" items={stats.topVendors.map((vendor) => ({
            name: vendor.name,
            value: formatCurrency(vendor.total_revenue),
          }))} emptyLabel="No vendor data" />
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend: string
}

function MetricCard({ icon, label, value, trend }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-50 p-2">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{trend}</p>
        </div>
      </div>
    </div>
  )
}

interface StatStackProps {
  title: string
  items: { label: string, value: string }[]
}

function StatStack({ title, items }: StatStackProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
  <span className="text-slate-500 truncate">{item.label}</span>
  <span className="font-semibold text-slate-900 shrink-0">{item.value}</span>
</div>
        ))}
      </div>
    </div>
  )
}

interface TopListProps {
  title: string
  items: { name: string, value: string }[]
  emptyLabel: string
}

function TopList({ title, items, emptyLabel }: TopListProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      {items.length > 0 ? (
        <div className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <div key={`${title}-${item.name}`} className="flex items-center justify-between gap-2 text-slate-600">
  <span className="text-slate-900 truncate">{item.name}</span>
  <span className="font-semibold text-slate-900 shrink-0">{item.value}</span>
</div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  )
}