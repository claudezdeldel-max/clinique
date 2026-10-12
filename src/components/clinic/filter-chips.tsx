import { cn } from '@/lib/utils'

export interface FilterOption {
  key: string
  label: string
  count?: number
}

interface FilterChipsProps {
  options: FilterOption[]
  activeKey: string
  onSelect: (key: string) => void
  className?: string
}

export function FilterChips({ options, activeKey, onSelect, className }: FilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((opt) => {
        const isActive = activeKey === opt.key
        return (
          <button
            key={opt.key}
            data-testid={`chip-${opt.key}`}
            type="button"
            onClick={() => onSelect(opt.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
              isActive
                ? 'bg-gradient-to-r from-[var(--brand-from,#0ea5e9)] to-[var(--brand-to,#6366f1)] text-white border-transparent shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                data-testid={`chip-${opt.key}-count`}
                className={cn(
                  'ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
                  isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
