import { useEffect, useState } from 'react'
import { addPatientDocument, fetchApi, getPatientById, getPrescriptions } from '@/lib/api'
import { useAccountStore } from '@/stores/account-store'
import { Button } from '@/components/ui/button'
import { PrescriptionModal } from './prescription-modal'
import { toast } from 'sonner'
import { printPrescription } from '@/lib/print-document'

export function DossierExtras({ patientId, type }: { patientId: number; type: 'prescriptions' | 'images' }) {
  const account = useAccountStore(s => s.user)
  const [patient, setPatient] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      const data = await getPatientById(patientId)
      setPatient(data)
      setItems(type === 'prescriptions' ? await getPrescriptions(patientId) : (data.documents || []).filter((d: any) => d.kind === 'image' || /\.(png|jpg|jpeg|webp|gif)$/i.test(d.url)))
      setError('')
    } catch (err) { setError((err as Error).message) }
  }
  useEffect(() => { if (account?.features[type]) void load() }, [patientId, type, account?.id, account?.features[type]])
  if (!account?.features[type]) return <p className="p-6 text-muted-foreground">Cette fonction est désactivée pour votre compte.</p>
  return <div className="p-6 space-y-4">
    {error && <div role="alert" className="text-destructive">{error}<Button variant="outline" onClick={load}>Réessayer</Button></div>}
    {type === 'prescriptions' ? <>
      <Button disabled={!patient} onClick={() => setOpen(true)}>Nouvelle prescription</Button>
      {items.map(p => <article key={p.id} className="border rounded-xl p-4 space-y-2"><h3 className="font-semibold">{p.prescription_no} — {p.date}</h3><p className="text-sm text-muted-foreground">{p.doctor_name}</p><ul className="space-y-2">{p.medications.map((m: any, i: number) => <li key={i}>{m.name} · {m.dosage} · {m.posology} · {m.duration}</li>)}</ul><p>{p.instructions}</p><Button size="sm" variant="outline" onClick={() => void printPrescription(p).catch(err => toast.error(err.message))}>Imprimer l’ordonnance</Button></article>)}
      {patient && <PrescriptionModal key={open ? 'new' : 'closed'} open={open} onOpenChange={setOpen} patientId={patientId} patientName={patient.name} patientObj={patient} doctorName={account.name} onPrescriptionSaved={() => void load()} />}
    </> : <>
      <label className="inline-block"><span className="block font-semibold mb-2">Ajouter une image au dossier</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !patient} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return
        setBusy(true)
        try {
          if (file.size > 12 * 1024 * 1024) throw new Error('Image trop volumineuse (maximum 12 Mo).')
          const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Lecture impossible')); reader.readAsDataURL(file) })
          const uploaded = await fetchApi<{ url: string }>('/scans/upload', { method: 'POST', body: JSON.stringify({ data, filename: file.name }) })
          await addPatientDocument(patientId, { title: file.name, url: uploaded.url, kind: 'image' }); await load(); toast.success('Image ajoutée au dossier')
        } catch (err) { toast.error((err as Error).message) } finally { setBusy(false); e.target.value = '' }
      }} /></label>
      <div className="grid sm:grid-cols-2 gap-4">{items.map(d => <figure key={d.id} className="border rounded-xl p-3"><a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.title} className="w-full h-64 object-contain bg-muted rounded-lg" /></a><figcaption className="mt-2 text-sm">{d.title}</figcaption></figure>)}</div>
    </>}
    {!error && items.length === 0 && <p className="text-muted-foreground">{type === 'images' ? 'Aucune image enregistrée pour ce patient.' : 'Aucune prescription enregistrée pour ce patient.'}</p>}
  </div>
}
