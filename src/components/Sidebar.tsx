"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Users,
  Package,
  Layers,
  Gavel,
  MessageSquare,
  Settings,
  Menu,
  ChevronDown,
  FileText,
  Brush,
  GraduationCap,
  RotateCcw,
  Building2,
  Receipt,
  Globe,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasAdminAccess } from '@/lib/auth-utils'

interface NavItem {
  name: string
  href?: string
  icon?: React.ElementType
  subItems?: SubNavItem[]
  badge?: string
  isCategory?: boolean
}

interface SubNavItem {
  name: string
  href: string
  badge?: string
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Consignments', href: '/consignments', icon: Package },
  { name: 'Artists', href: '/artists', icon: Brush },
  { name: 'Galleries', href: '/galleries', icon: Building2 },
  { name: 'School of Art', href: '/schools', icon: GraduationCap },
  { name: 'Inventory', href: '/items', icon: Layers },
  { name: 'Auctions', href: '/auctions', icon: Gavel },
  {
    name: 'Website',
    href: '/website',
    icon: Globe,
    subItems: [
      { name: 'Metsab', href: '/website/metsab' },
      { name: 'Aurum', href: '/website/aurum' }
    ]
  },
  { name: 'Social Media', href: '/social-media', icon: MessageSquare },
  { name: 'Accountancy', isCategory: true },
  {
    name: 'XERO',
    href: '/xero',
    icon: DollarSign,
    subItems: [
      { name: 'Connection', href: '/xero/connection' },
      { name: 'Tax Rates', href: '/xero/tax-rates' },
      { name: 'Invoices', href: '/xero/invoices' },
      { name: 'Bank Transfers', href: '/xero/bank-transfers' },
      { name: 'Bank Transactions', href: '/xero/bank-transactions' },
      { name: 'Accounts', href: '/xero/accounts' },
      { name: 'Attachments', href: '/xero/attachments' },
      { name: 'Credit Notes', href: '/xero/credit-notes' },
      { name: 'History & Notes', href: '/xero/history-notes' },
      { name: 'Invoice Reminders', href: '/xero/invoice-reminders' },
      { name: 'Reports', href: '/xero/reports' },
      { name: 'Types & Codes', href: '/xero/types-codes' }
    ]
  },
  { name: 'Auction Invoicing', href: '/invoices', icon: FileText },
  {
    name: 'Internal Communication',
    href: '/internal-communication',
    icon: MessageSquare,
    subItems: [
      { name: 'Chat', href: '/internal-communication' },
      { name: 'Campaigns', href: '/internal-communication/campaigns' }
    ]
  },
  // { 
  //   name: 'Reports', 
  //   href: '/reports', 
  //   icon: BarChart3,
  //   subItems: [
  //     { name: 'Item Charge', href: '/reports/item-charge' },
  //     { name: 'Invoice Payment Summary', href: '/reports/invoice-payment' },
  //     { name: 'Settlements Summary', href: '/reports/settlements' },
  //     { name: 'Auction Results', href: '/reports/auction-results' },
  //     { name: 'Vendor Results', href: '/reports/vendor-results' },
  //     { name: 'Debtors', href: '/reports/debtors' },
  //     { name: 'Payments', href: '/reports/payments' }
  //   ]
  // },
  // { 
  //   name: 'Valuations', 
  //   href: '/valuations', 
  //   icon: ClipboardList,
  //   subItems: [
  //     { name: 'Days', href: '/valuations' },
  //     { name: 'Regions', href: '/valuations/regions' },
  //     { name: 'Leads', href: '/valuations/leads' }
  //   ]
  // },

  { name: 'Refunds', href: '/refunds', icon: RotateCcw },
  {
    name: 'Reimbursements',
    href: '/reimbursements',
    icon: Receipt,
    subItems: [
      { name: 'Food', href: '/reimbursements?category=food' },
      { name: 'Fuel', href: '/reimbursements?category=fuel' },
      { name: 'Internal Logistics', href: '/reimbursements?category=internal_logistics' },
      { name: 'International Logistics', href: '/reimbursements?category=international_logistics' },
      { name: 'Stationary', href: '/reimbursements?category=stationary' },
      { name: 'Travel', href: '/reimbursements?category=travel' },
      { name: 'Accommodation', href: '/reimbursements?category=accommodation' },
      { name: 'Other', href: '/reimbursements?category=other' },
      { name: 'Accountant', href: '/reimbursements?status=accountant_approved', badge: '3' }
    ]
  }
]

const settingsItems: SubNavItem[] = [
  { name: 'Users', href: '/settings/users' },
  // { name: 'Tags', href: '/settings/tags' },
  // { name: 'Messages', href: '/settings/messages' },
  // { name: 'VAT Rates', href: '/settings/vat-rates' },
  { name: 'Payment Methods', href: '/settings/payment-methods' },
  // { name: 'Item Charges', href: '/settings/item-charges' },
  // { name: 'Valuation Days', href: '/settings/valuation-days' },
  { name: 'Appearance', href: '/settings/appearance' },
  { name: 'Integrations', href: '/settings/integrations' },
  { name: 'Platform Credentials', href: '/settings/platforms' },
  { name: 'Brands & Visibility', href: '/settings/brands' },
  // { name: 'DAR', href: '/settings/dar' },
  { name: 'Compliance', href: '/settings/compliance' },
  { name: 'General', href: '/settings/general' },
  { name: 'About', href: '/settings/about' }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  // Auto-expand menus if on their routes
  useEffect(() => {
    const expanded = []
    if (pathname.startsWith('/valuations')) expanded.push('Valuations')
    if (pathname.startsWith('/reports')) expanded.push('Reports')
    if (pathname.startsWith('/reimbursements')) expanded.push('Reimbursements')
    if (pathname.startsWith('/settings')) expanded.push('Settings')
    if (pathname.startsWith('/website')) expanded.push('Website')
    if (pathname.startsWith('/xero')) expanded.push('XERO')
    setExpandedMenus(expanded)
  }, [pathname])

  // Auto-navigate to first submenu item when parent is clicked
  useEffect(() => {
    const currentItem = navigationItems.find(item =>
      (item.name === 'Reports' || item.name === 'Valuations' || item.name === 'Reimbursements' || item.name === 'Website' || item.name === 'XERO') &&
      pathname === item.href
    )
    if (currentItem && currentItem.subItems) {
      router.push(currentItem.subItems[0].href)
    }

    // Handle settings auto-navigation
    if (pathname === '/settings') {
      router.push('/settings/users')
    }
  }, [pathname, router])

  const handleMenuClick = (item: NavItem) => {
    // Don't handle clicks for category items
    if (item.isCategory) return

    if (item.subItems && item.subItems.length > 0) {
      const isCurrentlyExpanded = expandedMenus.includes(item.name)

      if (isCurrentlyExpanded) {
        setExpandedMenus(prev => prev.filter(name => name !== item.name))
      } else {
        setExpandedMenus([item.name]) // Only one menu expanded at a time
        router.push(item.subItems[0].href)
      }
    } else {
      setExpandedMenus([])
    }
  }

  const handleSettingsClick = () => {
    const isCurrentlyExpanded = expandedMenus.includes('Settings')

    if (isCurrentlyExpanded) {
      setExpandedMenus(prev => prev.filter(name => name !== 'Settings'))
    } else {
      setExpandedMenus(['Settings'])
      router.push('/settings/users')
    }
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800 transition-[width] duration-300",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-4">
        {!isCollapsed ? (
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Control</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Admin Console</p>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-900 shadow-sm">
            AC
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:text-slate-900"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>


      <div className="flex-1 overflow-y-auto px-3 py-5">
        {!isCollapsed && (
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">
            Navigation
          </p>
        )}
        <ul className="mt-3 space-y-1.5">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            const isActive = item.href
              ? pathname === item.href ||
                pathname.startsWith(item.href + '/') ||
                (item.subItems && item.subItems.some(sub => pathname === sub.href))
              : false
            const isExpanded = expandedMenus.includes(item.name)

            if (item.isCategory) {
              return (
                <li key={item.name} className="pt-4">
                  {!isCollapsed && (
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">
                      {item.name}
                    </p>
                  )}
                </li>
              )
            }

            const baseButtonClasses = cn(
              "relative flex items-center gap-3 rounded-2xl text-sm font-medium transition-all",
              isCollapsed ? "justify-center p-3" : "px-4 py-2.5",
              isActive
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            )

            if (item.subItems) {
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => handleMenuClick(item)}
                    className={baseButtonClasses}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {IconComponent && (
                      <IconComponent className={cn(
                        "flex-shrink-0",
                        isCollapsed ? "h-5 w-5" : "h-5 w-5"
                      )} />
                    )}
                    {!isCollapsed && (
                      <div className="flex w-full items-center justify-between">
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-slate-400 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </button>

                  {!isCollapsed && isExpanded && (
                    <ul className="mt-2 space-y-1 border-l border-slate-200 pl-5">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.name}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              "flex items-center justify-between rounded-2xl px-3 py-2 text-[13px]",
                              pathname === subItem.href
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                                : "text-slate-500 hover:bg-white hover:text-slate-900"
                            )}
                          >
                            <span>{subItem.name}</span>
                            {subItem.badge && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                {subItem.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            }

            if (item.href) {
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => handleMenuClick(item)}
                    title={isCollapsed ? item.name : undefined}
                    className={baseButtonClasses}
                  >
                    {IconComponent && (
                      <IconComponent className={cn(
                        "flex-shrink-0",
                        isCollapsed ? "h-5 w-5" : "h-5 w-5"
                      )} />
                    )}
                    {!isCollapsed && (
                      <div className="flex w-full items-center justify-between">
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              )
            }

            return null
          })}
        </ul>

        {hasAdminAccess() && (
          <div className="mt-8">
            {!isCollapsed && (
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">
                Admin
              </p>
            )}
            <button
              type="button"
              onClick={handleSettingsClick}
              className={cn(
                "relative mt-3 flex w-full items-center gap-3 rounded-2xl text-sm font-medium transition-all",
                isCollapsed ? "justify-center p-3" : "px-4 py-2.5",
                pathname.startsWith('/settings')
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              )}
              title={isCollapsed ? 'Settings' : undefined}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex w-full items-center justify-between">
                  <span>Settings</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      expandedMenus.includes('Settings') && "rotate-180"
                    )}
                  />
                </div>
              )}
            </button>

            {!isCollapsed && expandedMenus.includes('Settings') && (
              <ul className="mt-2 space-y-1 border-l border-slate-200 pl-5">
                {settingsItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.href}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-3 py-2 text-[13px]",
                        pathname === subItem.href
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:bg-white hover:text-slate-900"
                      )}
                    >
                      <span>{subItem.name}</span>
                      {subItem.badge && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {subItem.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-5">
        <div className={cn(
          "rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm",
          isCollapsed ? "text-center" : "text-left"
        )}>
          {!isCollapsed ? (
            <>
              <p className="text-sm font-semibold text-slate-900">Need help?</p>
              <p className="mt-1 text-xs text-slate-500">Ping the internal chat for quick assistance.</p>
              <button
                onClick={() => router.push('/internal-communication')}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <MessageSquare className="h-4 w-4" />
                Open chat
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/internal-communication')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              title="Open chat"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
} 
