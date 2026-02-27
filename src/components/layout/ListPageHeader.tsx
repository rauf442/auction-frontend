'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderStat {
  label: string
  value: string | number
  tone?: 'default' | 'info' | 'success' | 'warning'
}

interface HeaderAction {
  label: string
  icon: LucideIcon
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}

interface ListPageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  stats?: HeaderStat[]
  actions?: HeaderAction[]
  className?: string
  children?: ReactNode
}

const statToneClasses: Record<NonNullable<HeaderStat['tone']>, string> = {
  default: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-100',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-700 ring-amber-100'
}

const actionVariantClasses: Record<NonNullable<HeaderAction['variant']>, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 border border-transparent hover:border-slate-200 hover:bg-white'
}

export function ListPageHeader({
  eyebrow,
  title,
  description,
  stats = [],
  actions = [],
  className,
  children
}: ListPageHeaderProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-slate-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-72 -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-slate-100 via-white to-slate-100 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.4),_transparent_60%)]" />
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              {eyebrow}
            </p>
          )}
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
          </div>
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {stats.map(({ label, value, tone = 'default' }) => (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-medium ring-1',
                    statToneClasses[tone]
                  )}
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-current/70">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-current">{value}</span>
                </span>
              ))}
            </div>
          )}
          {children}
        </div>

        {actions.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {actions.map(action => (
              <HeaderActionButton key={action.label} {...action} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function HeaderActionButton({
  icon: Icon,
  label,
  onClick,
  href,
  variant = 'secondary',
  disabled
}: HeaderAction) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-60'

  const composedClasses = cn(baseClasses, actionVariantClasses[variant])

  if (href) {
    return (
      <Link href={href} className={composedClasses} onClick={onClick} aria-disabled={disabled}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={composedClasses} disabled={disabled}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  )
}

