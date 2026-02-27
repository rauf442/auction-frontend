'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChipTone = 'neutral' | 'blue' | 'indigo' | 'emerald' | 'rose' | 'amber'

interface ActionChipProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  tone?: ChipTone
  disabled?: boolean
  className?: string
}

const toneClasses: Record<ChipTone, string> = {
  neutral: 'bg-slate-50 text-slate-700 ring-slate-100 hover:bg-slate-100',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100 hover:bg-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100 hover:bg-rose-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100 hover:bg-amber-100'
}

export function ActionChip({
  icon: Icon,
  label,
  onClick,
  href,
  tone = 'neutral',
  disabled,
  className
}: ActionChipProps) {
  const baseClasses =
    'inline-flex items-center rounded-2xl px-3 py-2 text-sm font-medium ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-50 disabled:cursor-not-allowed'

  const composed = cn(baseClasses, toneClasses[tone], className)

  if (href) {
    return (
      <Link href={href} className={composed} onClick={onClick} aria-disabled={disabled}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Link>
    )
  }

  return (
    <button type="button" className={composed} onClick={onClick} disabled={disabled}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  )
}

