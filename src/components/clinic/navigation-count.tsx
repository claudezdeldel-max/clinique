export function NavigationCount({ count, label }: { count?: number; label: string }) {
  if (count === undefined) return null
  return <span
    className="navigation-count ml-auto inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums group-data-[collapsible=icon]:hidden"
    aria-label={`${count.toLocaleString('fr-FR')} ${label}`}
    title={`${count.toLocaleString('fr-FR')} ${label}`}
    aria-live="polite"
  >{count.toLocaleString('fr-FR')}</span>
}
