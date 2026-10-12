import { useEffect, useState } from 'react'
import { fetchApi, getRooms } from '@/lib/api'
import { type ClinicRoom } from '@/hooks/use-clinic-resources'
import { useAccountStore } from '@/stores/account-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function AdminResourceManagement() {
  const user = useAccountStore(s => s.user)
  const [rooms, setRooms] = useState<ClinicRoom[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('IRM')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => {
    try { setRooms(await getRooms()); setError('') } catch (err) { setError((err as Error).message) }
  }
  useEffect(() => { void load() }, [])
  if (user?.role !== 'admin') return <p>Choisissez un compte administrateur pour gérer les salles.</p>
  return <Card><CardHeader><CardTitle>Salles d’examen</CardTitle><CardDescription>Les salles disponibles sont proposées dans la file d’attente et les rendez-vous. Les médecins et secrétaires se gèrent dans « Comptes et fonctions ».</CardDescription></CardHeader><CardContent className="space-y-5">
    {error && <div role="alert" className="text-destructive">{error}<Button variant="outline" onClick={load}>Réessayer</Button></div>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true)
      try { await fetchApi('/rooms', { method: 'POST', body: JSON.stringify({ name, type }) }); setName(''); await load(); toast.success('Salle enregistrée') }
      catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
    }}>
      <div className="space-y-2"><Label htmlFor="room-name">Nom de la salle</Label><Input id="room-name" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Salle échographie 2" /></div>
      <div className="space-y-2"><Label htmlFor="room-type">Type d’examen</Label><select id="room-type" value={type} onChange={e => setType(e.target.value)} className="border rounded-md p-2 bg-background">{['IRM','Scanner','Échographie','Radiographie','Mammographie','Autre'].map(t => <option key={t}>{t}</option>)}</select></div>
      <Button type="submit" disabled={busy || !name.trim()}>{busy ? 'Enregistrement…' : 'Ajouter une salle'}</Button>
    </form>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{rooms.map(room => <div key={room.id} className="rounded-lg border p-4 space-y-3">
      <p className="font-semibold">{room.name}</p><p className="text-sm text-muted-foreground">{room.type} · {room.status === 'available' ? 'Disponible' : room.status === 'busy' ? 'Occupée' : 'Indisponible'}</p>
      <Button disabled={busy} size="sm" variant="outline" onClick={async () => {
        setBusy(true)
        try { await fetchApi(`/rooms/${room.id}`, { method: 'PUT', body: JSON.stringify({ status: room.status === 'maintenance' ? 'available' : 'maintenance' }) }); await load(); toast.success('Disponibilité enregistrée') }
        catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
      }}>{room.status === 'maintenance' ? 'Rendre disponible' : 'Rendre indisponible'}</Button>
    </div>)}</div>
  </CardContent></Card>
}
