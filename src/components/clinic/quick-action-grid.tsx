import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface QuickActionItem {
  id: string
  testId?: string
  title: string
  description?: string
  icon: React.ReactNode
  color?: string
  onClick: () => void
}

interface QuickActionGridProps {
  items: QuickActionItem[]
  className?: string
}

export function QuickActionGrid({ items, className }: QuickActionGridProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {items.map((item) => (
        <Card
          key={item.id}
          data-testid={item.testId || `quick-action-${item.id}`}
          onClick={item.onClick}
          className="cursor-pointer transition-all border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
        >
          <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              {item.icon}
            </div>
            <span className="text-xs font-extrabold text-foreground">{item.title}</span>
            {item.description && (
              <span className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
