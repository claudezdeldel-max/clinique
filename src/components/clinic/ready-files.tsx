import { formatPhoneNumber } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { getReadyFiles, updateReadyFile, fetchApi } from '@/lib/api'
import { printDocument, escapeText } from '@/lib/print-document'
import DOMPurify from 'dompurify'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAccountStore } from '@/stores/account-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const labels: Record<string, string> = { ready: 'Dossier prêt', informed: 'Patient informé', delivered: 'Dossier remis' }
export function ReadyFiles() {
  const account = useAccountStore(s => s.user)
  const [files, setFiles] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('pending')
  const [preview, setPreview] = useState<any>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!account?.features.ready_files) return
    setFiles([]); setPreview(null); setLoading(true)
    let cancelled = false
    const load = async () => {
      try { const data = await getReadyFiles(); if (!cancelled) { setFiles(data); setError('') } }
      catch (err) { if (!cancelled) setError((err as Error).message) }
      finally { if (!cancelled) setLoading(false) }
    }
    void load(); const timer = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [account?.id, account?.features.ready_files, retry])
  const change = async (id: number, status: string) => {
    if (busy !== null) return
    setBusy(id)
    try {
      await updateReadyFile(id, status); setFiles(await getReadyFiles()); toast.success(labels[status])
    } catch (err) { toast.error((err as Error).message) } finally { setBusy(null) }
  }
  const filteredFiles = files.filter(f => (filter === 'all' || (filter === 'delivered' ? f.delivery_status === 'delivered' : f.delivery_status !== 'delivered')) && `${f.patient_name} ${f.report_no}`.toLowerCase().includes(search.toLowerCase()))
  return <Card data-testid="ready-files"><CardHeader><CardTitle>Dossiers prêts</CardTitle><CardDescription>Comptes rendus finalisés dont l’impression a été lancée. Informez le patient, puis confirmez la remise.</CardDescription></CardHeader><CardContent className="space-y-4">
    {!account?.features.ready_files ? <p>Connectez-vous à un compte autorisé pour consulter les dossiers prêts.</p> : <>
      <div className="flex flex-wrap gap-3"><Input aria-label="Rechercher un dossier prêt" className="max-w-sm" placeholder="Nom du patient ou numéro du compte rendu" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Statut des dossiers prêts" className="border rounded-md p-2 bg-background" value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">À suivre</option><option value="all">Tous les dossiers</option><option value="delivered">Dossiers remis</option></select></div>
      {error && <div role="alert" className="text-destructive">{error}<Button variant="outline" onClick={() => setRetry(value => value + 1)}>Réessayer</Button></div>}
      {loading ? <p>Chargement…</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-3">Patient</th><th className="p-3">Compte rendu</th><th className="p-3">Suivi</th><th className="p-3">Actions</th></tr></thead><tbody>
        {filteredFiles.map(f => <tr key={f.id} className="border-b" data-testid={`ready-file-${f.id}`}>
          <td className="p-3 font-semibold">{f.patient_name}<div className="text-xs font-normal text-muted-foreground">{formatPhoneNumber(f.phone) || 'Téléphone non renseigné'}</div></td>
          <td className="p-3">{f.report_no}<div className="text-xs text-muted-foreground">{f.exam_type}</div></td>
          <td className="p-3"><span className="font-semibold">{labels[f.delivery_status]}</span><div className="text-xs text-muted-foreground">Prêt : {new Date(f.print_started_at).toLocaleString('fr-FR')}</div>{f.patient_informed_at && <div className="text-xs">Informé : {new Date(f.patient_informed_at).toLocaleString('fr-FR')}</div>}{f.delivered_at && <div className="text-xs">Remis : {new Date(f.delivered_at).toLocaleString('fr-FR')}</div>}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy !== null} onClick={async () => { setBusy(f.id); try { setPreview(await fetchApi(`/ready-files/${f.id}`)) } catch (err) { toast.error((err as Error).message) } finally { setBusy(null) } }}>Voir le compte rendu</Button>{f.delivery_status === 'ready' && <Button disabled={busy !== null} size="sm" onClick={() => change(f.id, 'informed')}>Patient informé</Button>}{f.delivery_status === 'informed' && <Button disabled={busy !== null} size="sm" onClick={() => change(f.id, 'delivered')}>Dossier remis</Button>}</div></td>
        </tr>)}
      </tbody></table>{filteredFiles.length === 0 && <p className="p-4 text-muted-foreground">{files.length ? 'Aucun dossier ne correspond aux filtres.' : 'Aucun dossier prêt pour le moment.'}</p>}</div>}
    </>}
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null) }}><DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{preview?.report_no} — {preview?.patient_name}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{preview?.exam_type} · {preview?.author}</p><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview?.content_html || '') }} />{preview && <Button onClick={() => void printDocument(preview.report_no, `<h1>RadioMed — Compte rendu médical</h1><p>${escapeText(preview.patient_name)} · ${escapeText(preview.report_no)} · ${escapeText(preview.author)}</p>${preview.content_html}`, 'Compte rendu', preview.id).catch(err => toast.error(err.message))}>Imprimer une copie</Button>}</DialogContent></Dialog>
  </CardContent></Card>
}
