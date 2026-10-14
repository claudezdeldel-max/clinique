import { useEffect, useId, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { getPatients } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatPhoneNumber } from '@/lib/utils'

export function PatientPicker({ value, onChange, onNew, disabled = false }: {
  value: any | null; onChange: (patient: any | null) => void; onNew: () => void; disabled?: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState(value?.name || '')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState(0)
  useEffect(() => { if (value?.id) setQuery(value.name) }, [value?.id, value?.name])
  useEffect(() => {
    if (!open || disabled) return
    let cancelled = false
    setLoading(true); setItems([]); setError(''); setActive(0)
    const timer = setTimeout(async () => {
      try {
        const result = await getPatients({ search: query.trim(), page_size: 20 })
        if (!cancelled) setItems(result.items)
      } catch (err) { if (!cancelled) setError((err as Error).message) }
      finally { if (!cancelled) setLoading(false) }
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, open, disabled])
  const select = (patient: any) => { onChange(patient); setQuery(patient.name); setOpen(false) }
  return <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false) }}>
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
        <Input role="combobox" aria-label="Rechercher un patient" aria-expanded={open} aria-controls={`${id}-results`} aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${id}-${items[active].id}` : undefined}
          value={query} placeholder="Rechercher un patient…" readOnly={disabled} className="pl-9"
          onFocus={() => { if (!disabled) setOpen(true) }}
          onChange={event => { setQuery(event.target.value); onChange(null); setOpen(true) }}
          onKeyDown={event => {
            if (disabled) return
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, Math.max(0, items.length - 1))) }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)) }
            if (event.key === 'Enter' && open) { event.preventDefault(); if (items[active]) select(items[active]) }
          }} />
      </div>
      <Button type="button" variant="outline" size="icon" aria-label="Nouveau patient" title="Nouveau patient" disabled={disabled} onClick={onNew}><Plus className="size-4" /></Button>
    </div>
    {open && <div id={`${id}-results`} role="listbox" aria-label="Patients" className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-popover border rounded-lg shadow-lg">
      {loading || error || !items.length ? <p role="status" className="p-3 text-sm text-muted-foreground">{loading ? 'Recherche…' : error || 'Aucun patient trouvé'}</p> : items.map((patient, index) => <button
        type="button" role="option" aria-selected={index === active} id={`${id}-${patient.id}`} key={patient.id}
        onMouseDown={event => event.preventDefault()} onClick={() => select(patient)}
        className={`block w-full p-3 text-left hover:bg-muted ${index === active ? 'bg-muted/50' : ''}`}>
        <span className="block text-sm font-medium">{patient.name}</span>
        {patient.phone && <span className="block text-xs text-muted-foreground">{formatPhoneNumber(patient.phone)}</span>}
      </button>)}
    </div>}
  </div>
}
