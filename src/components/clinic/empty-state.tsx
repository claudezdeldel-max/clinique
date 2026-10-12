import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon = <FolderOpen className="size-10 text-muted-foreground/60" />,
  title = 'Aucune donnée trouvée',
  description = 'Aucun élément ne correspond à votre recherche ou vos filtres actuels.',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border-2 border-dashed bg-muted/20',
        className
      )}
    >
      <div className="p-4 rounded-full bg-muted/50 mb-3">{icon}</div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
