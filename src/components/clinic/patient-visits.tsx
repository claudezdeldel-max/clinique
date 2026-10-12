import { useEffect, useState, type FormEvent } from 'react'
import { Activity, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createPatientVisit, getPatientVisits, type PatientVisitMeasurement } from '@/lib/api'
import { useAccountStore } from '@/stores/account-store'
import { formatClinicDate } from '@/stores/clinic-preferences-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function PatientVisits({ patientId, patientName, queueId, appointmentId }: { patientId: number; patientName: string; queueId?: number; appointmentId?: number }) {
  const accountId = useAccountStore(state => state.user?.id)
  const [visits, setVisits] = useState<PatientVisitMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState(() => ({ visit_date: today(), weight: '', systolic: '', diastolic: '', notes: '' }))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setVisits([])
    setLoadError('')
    getPatientVisits(patientId).then(data => { if (!cancelled) setVisits(data) })
      .catch(error => { if (!cancelled) setLoadError(error.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [patientId, accountId])

  const retry = async () => {
    setLoading(true)
    setLoadError('')
    try { setVisits(await getPatientVisits(patientId)) }
    catch (error) { setLoadError((error as Error).message) }
    finally { setLoading(false) }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaveError('')
    if (!form.weight && !form.systolic && !form.diastolic) { setSaveError('Renseignez au moins le poids ou la tension.'); return }
    if (!!form.systolic !== !!form.diastolic) { setSaveError('Renseignez la tension systolique et la tension diastolique.'); return }
    setSaving(true)
    try {
      const saved = await createPatientVisit(patientId, {
        visit_date: form.visit_date,
        weight: form.weight ? Number(form.weight) : null,
        systolic: form.systolic ? Number(form.systolic) : null,
        diastolic: form.diastolic ? Number(form.diastolic) : null,
        notes: form.notes,
        queue_id: queueId,
        appointment_id: appointmentId,
      })
      setVisits(previous => [saved, ...previous].sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id))
      setForm(previous => ({ ...previous, weight: '', systolic: '', diastolic: '', notes: '' }))
      toast.success('Relevé enregistré dans l’historique de la visite')
    } catch (error) { setSaveError((error as Error).message) }
    finally { setSaving(false) }
  }

  return <div className="space-y-5" data-testid="patient-visits">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" /> Poids et tension à chaque visite</CardTitle>
        <p className="text-sm font-semibold">{patientName} · Dossier #PAT-{patientId}</p>
        <CardDescription>Ajoutez un relevé daté. Chaque enregistrement est conservé dans l’historique du patient.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={saving || loading || !!loadError} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="visit-date">Date de la visite</Label><Input id="visit-date" type="date" required value={form.visit_date} onChange={event => setForm(previous => ({ ...previous, visit_date: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="visit-weight">Poids (kg)</Label><Input id="visit-weight" type="number" min="0.1" step="0.1" placeholder="Ex. 75,5" value={form.weight} onChange={event => setForm(previous => ({ ...previous, weight: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="visit-systolic">Tension systolique (mmHg)</Label><Input id="visit-systolic" type="number" min="1" step="1" placeholder="Ex. 120" value={form.systolic} onChange={event => setForm(previous => ({ ...previous, systolic: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="visit-diastolic">Tension diastolique (mmHg)</Label><Input id="visit-diastolic" type="number" min="1" step="1" placeholder="Ex. 80" value={form.diastolic} onChange={event => setForm(previous => ({ ...previous, diastolic: event.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="visit-notes">Observation (facultative)</Label><Textarea id="visit-notes" maxLength={4000} placeholder="Observation liée à ce relevé…" value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} /></div>
          </fieldset>
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <Button type="submit" disabled={saving || loading || !!loadError}><Save className="size-4" /> {saving ? 'Enregistrement…' : 'Enregistrer le relevé'}</Button>
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Historique des visites</CardTitle><CardDescription>{visits.length} relevé(s) enregistré(s), du plus récent au plus ancien.</CardDescription></CardHeader>
      <CardContent>
        {loadError ? <div role="alert" className="space-y-3"><p className="text-destructive">{loadError}</p><Button variant="outline" onClick={() => void retry()}>Réessayer</Button></div> : loading ? <p className="text-muted-foreground">Chargement de l’historique…</p> : visits.length === 0 ? <p className="text-muted-foreground">Aucun relevé enregistré pour ce patient.</p> : <div className="overflow-x-auto">
          <table aria-label="Historique du poids et de la tension" className="w-full text-left text-sm">
            <thead><tr className="border-b text-muted-foreground"><th className="p-3">Visite</th><th className="p-3 whitespace-nowrap">Poids (kg)</th><th className="p-3 whitespace-nowrap">Tension (mmHg)</th><th className="p-3">Observation</th><th className="p-3">Enregistré par</th></tr></thead>
            <tbody>{visits.map(visit => <tr key={visit.id} className="border-b last:border-0" data-testid={`patient-visit-${visit.id}`}>
              <td className="p-3 whitespace-nowrap"><time dateTime={visit.visit_date}>{formatClinicDate(visit.visit_date + 'T12:00:00')}</time>{(visit.queue_id || visit.appointment_id) && <p className="text-xs text-muted-foreground">{visit.queue_id ? `Passage #${visit.queue_id}` : `RDV #${visit.appointment_id}`}</p>}</td>
              <td className="p-3 tabular-nums">{visit.weight === null ? '—' : visit.weight.toLocaleString('fr-FR')}</td>
              <td className="p-3 whitespace-nowrap tabular-nums">{visit.systolic === null ? '—' : `${visit.systolic} / ${visit.diastolic}`}</td>
              <td className="p-3 min-w-40 max-w-72 whitespace-pre-wrap break-words">{visit.notes || '—'}</td>
              <td className="p-3">{visit.recorded_by_name}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </CardContent>
    </Card>
  </div>
}
