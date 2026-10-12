import { cn } from '@/lib/utils'

export type StatusType =
  | 'waiting'
  | 'confirmed'
  | 'urgent'
  | 'done'
  | 'completed'
  | 'cancelled'
  | 'arrived'
  | 'in_progress'
  | 'paid'
  | 'partial'
  | 'pending'
  | 'unpaid'
  | 'active'
  | 'inactive'

interface StatusPillProps {
  status: StatusType | string
  label?: string
  className?: string
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const normalized = (status || '').toLowerCase()

  let styleClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  let defaultLabel = status

  switch (normalized) {
    case 'waiting':
    case 'en attente':
    case 'pending':
      styleClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
      defaultLabel = label || 'En attente'
      break
    case 'confirmed':
    case 'confirmé':
    case 'active':
    case 'actif':
    case 'paid':
    case 'payé':
      styleClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
      defaultLabel = label || 'Confirmé'
      break
    case 'urgent':
    case 'urgente':
      styleClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/40 font-bold'
      defaultLabel = label || 'Urgent'
      break
    case 'done':
    case 'completed':
    case 'terminé':
      styleClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
      defaultLabel = label || 'Terminé'
      break
    case 'arrived':
    case 'arrivé':
      styleClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
      defaultLabel = label || 'Arrivé'
      break
    case 'in_progress':
    case 'en cours':
      styleClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/40 animate-pulse'
      defaultLabel = label || 'En cours'
      break
    case 'called':
    case 'appelé':
      styleClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
      defaultLabel = label || 'Appelé'
      break
    case 'cancelled':
    case 'annulé':
    case 'unpaid':
    case 'impayé':
      styleClass = 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800/40'
      defaultLabel = label || 'Annulé'
      break
    case 'partial':
    case 'acompte':
      styleClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800/40'
      defaultLabel = label || 'Solde dû'
      break
  }

  return (
    <span
      data-testid="status-pill"
      data-status={normalized}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
        styleClass,
        className
      )}
    >
      {label || defaultLabel}
    </span>
  )
}
