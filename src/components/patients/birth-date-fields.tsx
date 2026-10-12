import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calculateAge } from '@/lib/utils'

export function BirthDateFields({ id, value, onChange, readOnly = false }: {
  id: string; value: string; onChange: (value: string) => void; readOnly?: boolean
}) {
  const today = new Date()
  const max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1.5">
      <Label htmlFor={`${id}_birth_date`}>Date de naissance</Label>
      <Input id={`${id}_birth_date`} type="date" value={value} max={max} readOnly={readOnly} onChange={event => onChange(event.target.value)} />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor={`${id}_age`}>Âge calculé (ans)</Label>
      <Input id={`${id}_age`} type="number" value={calculateAge(value) ?? ''} placeholder="Calculé automatiquement" readOnly />
    </div>
  </div>
}
