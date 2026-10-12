import React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeroBannerProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Alias of `description` */
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  /** Convenience: renders a primary white CTA button */
  primaryLabel?: string
  onPrimaryClick?: () => void
  className?: string
}

export function HeroBanner({
  title,
  description,
  subtitle,
  actions,
  primaryLabel,
  onPrimaryClick,
  className,
}: HeroBannerProps) {
  const body = description ?? subtitle
  const primary =
    primaryLabel && onPrimaryClick ? (
      <button
        type="button"
        data-testid="hero-primary-btn"
        onClick={onPrimaryClick}
        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Plus className="size-4" /> {primaryLabel}
      </button>
    ) : null

  return (
    <div
      data-testid="hero-banner"
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 md:p-8 text-white shadow-lg',
        'bg-gradient-to-r from-[var(--brand-from,#0ea5e9)] to-[var(--brand-to,#6366f1)]',
        className
      )}
    >
      {/* Decorative background circles */}
      <div className="absolute -top-24 -right-12 size-80 rounded-full bg-white/10 pointer-events-none blur-xl"></div>
      <div className="absolute -bottom-20 right-32 size-60 rounded-full bg-white/5 pointer-events-none blur-lg"></div>

      <div className="relative z-10 space-y-3 max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
        {body && <div className="text-sm md:text-base opacity-90 leading-relaxed">{body}</div>}
        {(actions || primary) && (
          <div className="pt-3 flex flex-wrap items-center gap-3">
            {primary}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
