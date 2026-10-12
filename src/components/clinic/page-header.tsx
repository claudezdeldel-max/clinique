import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      data-testid="page-header"
      className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2', className)}
    >
      <div className="flex items-start sm:items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}
