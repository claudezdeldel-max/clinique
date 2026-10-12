import { useEffect, useRef, useState } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { fetchApi } from '@/lib/api'
import { getPrinterChoices, type PrinterChoices, type PrintJob } from '@/lib/printing'
import { usePrintDialogStore } from '@/stores/print-dialog-store'
import { useAccountStore } from '@/stores/account-store'
import { toast } from 'sonner'

export function PrintDialog() {
  const request = usePrintDialogStore(s => s.request), token = useAccountStore(s => s.token)
  const [choices, setChoices] = useState<PrinterChoices | null>(null), [printer, setPrinter] = useState('')
  const [copies, setCopies] = useState(1), [color, setColor] = useState(false), [duplex, setDuplex] = useState(false)
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const sending = useRef(false)
  const close = (job: PrintJob | null = null) => {
    request?.resolve(job)
    if (usePrintDialogStore.getState().request === request) usePrintDialogStore.getState().setRequest(null)
  }
  useEffect(() => {
    if (!request) return
    if (token !== request.token) { request.resolve(null); usePrintDialogStore.getState().setRequest(null); return }
    let cancelled = false
    setLoading(true); setError(''); setChoices(null); setCopies(1); setColor(false); setDuplex(false)
    getPrinterChoices(request.type).then(data => {
      if (!cancelled) { setChoices(data); setPrinter(data.default_printer) }
    }).catch(err => { if (!cancelled) setError(err.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request, token, retry])
  const selected = choices?.printers.find(p => p.name === printer)
  const isPdf = selected?.kind === 'pdf'
  const send = async () => {
    if (!request || !selected || sending.current || token !== request.token) return
    sending.current = true; setBusy(true); setError('')
    try {
      const result = await fetchApi<{ job: PrintJob; pdf?: string; duplicate?: boolean }>('/printing/jobs', { method: 'POST', body: JSON.stringify({
        request_id: request.requestId, title: request.title, html: request.html, document_type: request.type,
        report_id: request.reportId, printer, copies: isPdf ? 1 : copies, color, duplex: isPdf ? false : duplex,
      }) })
      if (useAccountStore.getState().token !== request.token) return
      if (result.job.status === 'failed') throw new Error(result.job.error || 'Cette impression a échoué. Fermez puis relancez la demande.')
      if (result.job.status === 'preparing') throw new Error('Cette demande est déjà en cours. Consultez l’historique avant de relancer.')
      if (result.pdf) {
        const bytes = Uint8Array.from(atob(result.pdf), char => char.charCodeAt(0))
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), link = document.createElement('a')
        link.href = url; link.download = `${request.title.replace(/[<>:"/\\|?*]/g, '-')}.pdf`; link.click()
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
      toast.success(isPdf ? 'PDF créé et téléchargé' : `Document envoyé à ${printer}`)
      close(result.job)
    } catch (err) { setError((err as Error).message) }
    finally { sending.current = false; setBusy(false) }
  }
  return <Dialog open={!!request} onOpenChange={open => { if (!open && !busy) close() }}>
    <DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Printer className="size-5" />Imprimer</DialogTitle><DialogDescription>{request?.title} · {request?.type}</DialogDescription></DialogHeader>
      {loading && <p role="status" className="text-sm">Recherche des imprimantes installées sur ce poste…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {choices && <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Poste : {choices.computer}</p>
        {choices.printers.length ? <><div className="space-y-2"><Label htmlFor="print-printer">Imprimante autorisée</Label><select id="print-printer" className="w-full rounded-md border bg-background p-2 text-sm" disabled={busy} value={printer} onChange={e => { setPrinter(e.target.value); setColor(false); setDuplex(false); setCopies(1) }}><option value="">Choisir une imprimante</option>{choices.printers.map(p => <option key={p.name} value={p.name} disabled={p.offline}>{p.name}{p.offline ? ' — Hors connexion' : p.is_default ? ' — Par défaut Windows' : ''}</option>)}</select></div>
          {selected && <p className="text-xs text-muted-foreground">{selected.driver}{selected.note && ` · ${selected.note}`}</p>}
          {!isPdf && <div className="space-y-2"><Label htmlFor="print-copies">Copies (maximum {choices.rule.max_copies})</Label><input id="print-copies" type="number" min={1} max={choices.rule.max_copies} value={copies} disabled={busy} onChange={e => setCopies(Number(e.target.value))} className="w-24 rounded-md border bg-background p-2 text-sm" /></div>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={color} disabled={busy || !choices.rule.color || !selected?.supports_color} onChange={e => setColor(e.target.checked)} />Couleur{(!choices.rule.color || !selected?.supports_color) && ' — Indisponible'}</label>
          {!isPdf && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={duplex} disabled={busy || !choices.rule.duplex || !selected?.supports_duplex} onChange={e => setDuplex(e.target.checked)} />Recto verso{(!choices.rule.duplex || !selected?.supports_duplex) && ' — Indisponible'}</label>}
        </> : <p className="text-sm text-muted-foreground">Aucune imprimante installée et autorisée. Demandez à l’administrateur de vérifier les accès dans Paramètres → Imprimantes.</p>}
      </div>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => close()}>Annuler</Button><Button variant="outline" disabled={loading || busy} onClick={() => setRetry(r => r + 1)}><RefreshCw className="size-4" />Actualiser</Button><Button disabled={loading || busy || !selected || selected.offline || !Number.isInteger(copies) || copies < 1 || copies > (choices?.rule.max_copies || 1)} onClick={() => void send()}>{busy ? 'Préparation…' : isPdf ? 'Télécharger le PDF' : 'Imprimer'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
