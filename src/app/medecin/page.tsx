import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/clinic/status-pill'
import { getAppointments } from '@/lib/api'
import { useQueue } from '@/hooks/use-queue'
import { queueDossierLink } from '@/lib/dossier-link'
import { useAccountStore, hasDossierAccess } from '@/stores/account-store'
import type { QueueItem } from '@/types/queue'
import { toast } from 'sonner'

export default function MedecinPage() {
  const navigate = useNavigate()
  const account = useAccountStore(s => s.user)
  const { queue, loading, paused, error, refreshQueue, callPatient, startExam, canCall } = useQueue({ enableAudio: true })
  const [appointments, setAppointments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [calling, setCalling] = useState<number | null>(null)
  useEffect(() => { getAppointments({ auto_queue: false }).then(setAppointments).catch(err => toast.error(err.message)) }, [])
  const open = (ticket: QueueItem) => {
    const link = queueDossierLink(ticket)
    if (link) navigate(link)
    else toast.error('Ce ticket doit être associé à un patient enregistré.')
  }
  const matches = (name: string, exam: string) => `${name} ${exam}`.toLowerCase().includes(search.toLowerCase())
  const worklist = queue.filter(q => ['waiting', 'called', 'in_progress'].includes(q.status) && matches(q.patient_name, q.modality_name || ''))
    .sort((a, b) => a.id - b.id)
  return <BaseLayout title="Espace Médecin Radiologue" description="File d’attente, dossier patient et comptes rendus">
    <div className="px-4 md:px-6 space-y-6">
      {error && <div role="alert" className="border rounded-lg p-3 text-destructive">{error}<Button variant="outline" onClick={refreshQueue}>Réessayer</Button></div>}
      <Input data-testid="medecin-patient-search" placeholder="Rechercher un patient ou un examen…" value={search} onChange={e => setSearch(e.target.value)} />
      {paused && <p role="status" className="rounded-md border p-3">Les appels sont en pause.</p>}
      {!account && <p className="text-muted-foreground">Connectez-vous dans le menu latéral pour appeler les patients et accéder aux dossiers.</p>}
      <Card><CardHeader><CardTitle>File d’attente médecin</CardTitle><p className="text-sm text-muted-foreground">Cliquez sur le nom ou sur « Ouvrir le dossier ». L’appel ouvre directement le compte rendu du patient.</p></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-3">Patient</th><th className="p-3">Examen / Salle</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={4} className="p-6 text-center">Chargement…</td></tr> : worklist.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun patient en attente.</td></tr> : worklist.map(item => <tr key={item.id} data-testid={`doctor-queue-${item.id}`} className={`border-b ${item.status !== 'waiting' ? 'bg-primary/5' : ''}`}>
            <td className="p-3"><button disabled={!hasDossierAccess(account) || !item.patient_id} className="font-semibold hover:underline disabled:no-underline" onClick={() => open(item)}>{item.patient_name}</button><div className="text-xs text-muted-foreground">{item.ticket_number}</div></td>
            <td className="p-3">{item.modality_name}<div className="text-xs text-muted-foreground">{item.room_name}</div></td>
            <td className="p-3"><StatusPill status={item.status} /></td>
            <td className="p-3"><div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" disabled={!hasDossierAccess(account) || !item.patient_id} onClick={() => open(item)}>Ouvrir le dossier</Button>
              <Button size="sm" disabled={item.status === 'in_progress' || !canCall(item) || (paused && item.status === 'waiting') || !!error || calling !== null} onClick={async () => {
                setCalling(item.id)
                try {
                  if (item.status === 'waiting') {
                    const called = await callPatient(item)
                    if (called && hasDossierAccess(account)) open(called)
                  } else {
                    await startExam(item)
                  }
                } finally { setCalling(null) }
              }}>{item.status === 'waiting' ? 'Appeler' : item.status === 'called' ? 'Entrer' : 'En cours'}</Button>
            </div></td>
          </tr>)}
        </tbody></table></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Worklist d'Imagerie du Jour</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Patient</th><th className="p-3">Examen</th><th className="p-3">Médecin</th><th className="p-3">Actions</th></tr></thead><tbody>
        {appointments.filter(a => String(a.date_time).slice(0, 10) === new Date().toLocaleDateString('sv-SE') && matches(a.patient_name, a.modality_name || a.exam_type || '')).map(a => {
          const params = new URLSearchParams({ patientId: String(a.patient_id), patientName: a.patient_name, examType: a.modality_name || a.exam_type || '', appointmentId: String(a.id) })
          const ticket = queue.find(q => q.appointment_id === a.id)
          if (ticket) params.set('queueId', String(ticket.id))
          const link = `/comptes-rendus?${params}`
          return <tr key={a.id} className="border-b"><td className="p-3"><button className="font-semibold hover:underline" disabled={!a.patient_id || !hasDossierAccess(account)} onClick={() => navigate(link)}>{a.patient_name}</button></td><td className="p-3">{a.modality_name || a.exam_type}</td><td className="p-3">{a.radiologist}</td><td className="p-3"><Button size="sm" variant="outline" disabled={!a.patient_id || !hasDossierAccess(account)} onClick={() => navigate(link)}>Ouvrir le dossier</Button></td></tr>
        })}
      </tbody></table></div></CardContent></Card>
    </div>
  </BaseLayout>
}
