import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown } from 'lucide-react'

type IconInput = React.ReactNode | React.ComponentType<{ className?: string }>

export interface KpiCardProps {
  testId?: string
  kpiKey?: string
  title: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  /** Alias of `trendValue` (used by page-level dashboards) */
  change?: string
  /** Alias of `sub` */
  description?: string
  /** Accepts either a rendered element (<Users />) or a component (Users) */
  icon: IconInput
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red'
  className?: string
}

function renderIcon(icon: IconInput) {
  if (React.isValidElement(icon)) return icon
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object))) {
    const Icon = icon as React.ComponentType<{ className?: string }>
    return <Icon className="size-5" />
  }
  return icon as React.ReactNode
}

export function KpiCard({
  testId,
  kpiKey,
  title,
  value,
  sub,
  trend,
  trendValue,
  change,
  description,
  icon,
  color = 'blue',
  className,
}: KpiCardProps) {
  const colorStyles = {
    blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }

  const effectiveTestId = testId || (kpiKey ? `kpi-${kpiKey}` : undefined)
  const effectiveTrendValue = trendValue ?? change
  const effectiveSub = sub ?? description

  return (
    <Card
      data-testid={effectiveTestId}
      className={cn('kpi-card relative overflow-hidden border transition-all', className)}
    >
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('p-3 rounded-2xl shrink-0 flex items-center justify-center size-12', colorStyles[color])}>
          {renderIcon(icon)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <div className="text-2xl font-black tracking-tight text-foreground mt-0.5 truncate">{value}</div>
          {(effectiveSub || effectiveTrendValue) && (
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {effectiveTrendValue && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 font-bold',
                    trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                    trend === 'down' && 'text-rose-600 dark:text-rose-400',
                    (!trend || trend === 'neutral') && 'text-muted-foreground'
                  )}
                >
                  {trend === 'up' && <ArrowUp className="size-3" />}
                  {trend === 'down' && <ArrowDown className="size-3" />}
                  {effectiveTrendValue}
                </span>
              )}
              {effectiveSub && <span className="text-muted-foreground truncate">{effectiveSub}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
