import { useEffect, useState } from 'react'
import { Printer, RefreshCw, ShieldCheck, Save } from 'lucide-react'
import { useAccountStore } from '@/stores/account-store'
import { getPrinterSettings, getPrintJobs, newPrintRule, PRINT_TYPES, type PrintRule, type PrinterSettings, type PrintingPolicy, type PrintJob } from '@/lib/printing'
import { saveClinicSection } from '@/lib/clinic-settings'
import { toast } from 'sonner'

const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
const input = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm'
const statuses: Record<PrintJob['status'], string> = { preparing: 'Préparation', submitted: 'Envoyé au pilote', pdf: 'PDF créé', failed: 'Échec' }

export function PrinterSettingsPanel() {
  const account = useAccountStore(s => s.user), token = useAccountStore(s => s.token)
  const [data, setData] = useState<PrinterSettings | null>(null), [draft, setDraft] = useState<PrintingPolicy | null>(null)
  const [jobs, setJobs] = useState<PrintJob[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [scope, setScope] = useState<'roles' | 'users'>('roles'), [target, setTarget] = useState('admin')
  const isAdmin = account?.role === 'admin'
  useEffect(() => {
    setData(null); setDraft(null); setJobs([]); setError('')
  }, [token])
  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    let cancelled = false
    setLoading(true); setError('')
    Promise.all([getPrinterSettings(), getPrintJobs()]).then(([settings, history]) => {
      if (cancelled) return
      setData(settings); setDraft(current => current || structuredClone(settings.policy)); setJobs(history)
    }).catch(err => { if (!cancelled) setError(err.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, isAdmin, retry])
  if (!isAdmin) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-800">Imprimantes</h2><p className="mt-2 text-sm text-slate-600">Choisissez un compte administrateur pour gérer les imprimantes et les droits. Lors d’une impression, seules les imprimantes autorisées pour votre compte sont proposées.</p></section>
  const selectedUser = data?.accounts.find(a => String(a.id) === target)
  const inherited = scope === 'users' && !!draft && !Object.hasOwn(draft.users, target)
  const rule = draft?.[scope][target] || (scope === 'users' && selectedUser ? draft?.roles[selectedUser.role] : undefined) || newPrintRule()
  const updateRule = (change: Partial<PrintRule>) => setDraft(p => p ? { ...p, [scope]: { ...p[scope], [target]: { ...rule, ...change } } } : p)
  const knownNames = [...new Set([...(data?.printers.map(p => p.name) || []), ...Object.keys(draft?.printers || {}), ...(rule.printers || [])])]
  const save = async () => {
    if (!draft || busy) return
    setBusy(true)
    try {
      const saved = await saveClinicSection('printing', draft)
      setDraft(structuredClone(saved)); setData(d => d ? { ...d, policy: saved } : d)
      window.dispatchEvent(new Event('clinic-settings-updated')); toast.success('Accès aux imprimantes enregistrés'); setError('')
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  const dirty = !!draft && !!data && JSON.stringify(draft) !== JSON.stringify(data.policy)
  return <div className="space-y-6" data-testid="printer-settings">
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Printer className="size-5 text-indigo-600" />Imprimantes de ce poste</h2><p className="mt-1 text-xs text-slate-500">Détection automatique depuis les pilotes Windows{data && ` · ${data.computer}`}</p></div><button className={secondary} disabled={loading || busy} onClick={() => setRetry(r => r + 1)}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button></div>
      {loading && <p className="p-5 text-sm text-slate-500" role="status">Recherche des imprimantes installées…</p>}
      {error && <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button className="ml-3 underline" disabled={loading || busy} onClick={() => setRetry(r => r + 1)}>Réessayer</button></div>}
      {data && draft && <><div className="overflow-x-auto"><table className="settings-table w-full min-w-[850px] table-fixed text-sm"><colgroup><col className="w-[22%]" /><col className="w-[30%]" /><col className="w-[20%]" /><col className="w-[18%]" /><col className="w-[10%]" /></colgroup><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-5 py-3 text-left">Imprimante</th><th className="px-5 py-3 text-left">Pilote / Port</th><th className="px-5 py-3 text-left">État</th><th className="px-5 py-3 text-left">Papier</th><th className="px-5 py-3 text-left">Accès</th></tr></thead><tbody className="divide-y divide-slate-100">{data.printers.map(p => {
        const saved = draft.printers[p.name] || { enabled: true, paper: /pos[-\s]?80|thermal|receipt/i.test(`${p.name} ${p.driver}`) ? '80mm' as const : 'A4' as const }
        const change = (v: Partial<typeof saved>) => setDraft(d => d ? { ...d, printers: { ...d.printers, [p.name]: { ...saved, ...v } } } : d)
        return <tr key={p.name}><td className="px-5 py-4"><p className="font-semibold text-slate-800">{p.name}</p><p className="mt-1 text-xs text-slate-500">{p.is_default ? 'Par défaut Windows · ' : ''}{p.kind === 'pdf' ? 'Export PDF' : p.network ? 'Réseau' : 'Locale'}{p.supports_color ? ' · Couleur' : ''}{p.supports_duplex ? ' · Recto verso' : ''}</p></td><td className="px-5 py-4"><p>{p.driver}</p><p className="mt-1 break-all text-xs text-slate-500">{p.port}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs ${!p.managed || p.offline ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{!p.managed ? 'Application externe' : p.offline ? 'Hors connexion' : 'Installée'}</span>{p.note && <p className="mt-2 max-w-48 text-xs text-slate-500">{p.note}</p>}</td><td className="px-5 py-4"><select aria-label={`Papier ${p.name}`} value={saved.paper} className={input} disabled={busy || !p.managed} onChange={e => change({ paper: e.target.value as typeof saved.paper })}><option>A4</option><option value="80mm">Ticket 80 mm</option><option value="58mm">Ticket 58 mm</option></select></td><td className="px-5 py-4"><button type="button" role="switch" aria-label={`Activer ${p.name}`} aria-checked={p.managed && saved.enabled} disabled={busy || !p.managed} className={`toggle ${p.managed && saved.enabled ? 'on' : ''}`} onClick={() => change({ enabled: !saved.enabled })} /></td></tr>
      })}</tbody></table></div>{!data.printers.length && <p className="p-5 text-sm text-slate-500">Aucune imprimante installée. Installez son pilote dans Windows, puis cliquez sur Actualiser.</p>}<p className="px-5 pb-4 pt-2 text-xs text-slate-500">Dernière détection : {new Date(data.detected_at).toLocaleString('fr-FR')}. La liste est propre au PC sur lequel cette installation est lancée.</p></>}
    </section>
    {data && draft && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><ShieldCheck className="size-5 text-indigo-600" />Droits d’impression</h2><p className="mt-1 text-xs text-slate-500">Qui peut imprimer, quels documents et sur quelles imprimantes</p></div><button className={primary} disabled={busy || !dirty} onClick={() => void save()}><Save className="size-4" />{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      <div className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="printer-policy-scope" className="mb-1.5 block text-sm font-medium text-slate-700">Configurer</label><select id="printer-policy-scope" className={input} value={scope} disabled={busy} onChange={e => { const s = e.target.value as typeof scope; setScope(s); setTarget(s === 'roles' ? data.roles[0]?.id || '' : String(data.accounts[0]?.id || '')) }}><option value="roles">Rôle</option><option value="users">Utilisateur</option></select></div><div><label htmlFor="printer-policy-target" className="mb-1.5 block text-sm font-medium text-slate-700">{scope === 'roles' ? 'Rôle' : 'Utilisateur'}</label><select id="printer-policy-target" value={target} disabled={busy} className={input} onChange={e => setTarget(e.target.value)}>{scope === 'roles' ? data.roles.map(r => <option value={r.id} key={r.id}>{r.name}</option>) : data.accounts.map(a => <option value={a.id} key={a.id}>{a.name} · {data.roles.find(r => r.id === a.role)?.name || a.role}{!a.active ? ' · Inactif' : ''}</option>)}</select></div></div>
        {scope === 'users' && <label className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800"><input type="checkbox" checked={inherited} disabled={busy} onChange={e => setDraft(d => { if (!d) return d; const users = { ...d.users }; if (e.target.checked) delete users[target]; else users[target] = structuredClone(rule); return { ...d, users } })} />Utiliser les droits du rôle{selectedUser && ` (${data.roles.find(r => r.id === selectedUser.role)?.name || selectedUser.role})`}</label>}
        <fieldset disabled={busy || inherited || !target} className="space-y-5 disabled:opacity-60">
          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-800">Autoriser l’impression<button role="switch" type="button" aria-label="Autoriser l’impression" aria-checked={rule.enabled} className={`toggle ${rule.enabled ? 'on' : ''}`} onClick={() => updateRule({ enabled: !rule.enabled })} /></label>
          <div><h3 className="mb-2 text-sm font-semibold text-slate-700">Documents autorisés</h3><div className="grid gap-2 sm:grid-cols-2">{PRINT_TYPES.map(type => <label className="flex items-center gap-2 text-sm" key={type}><input type="checkbox" checked={rule.documents.includes(type)} onChange={e => updateRule({ documents: e.target.checked ? [...rule.documents, type] : rule.documents.filter(t => t !== type) })} />{type}</label>)}</div></div>
          <div><h3 className="mb-2 text-sm font-semibold text-slate-700">Imprimantes autorisées</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.printers === null} onChange={e => updateRule({ printers: e.target.checked ? null : [], default_printer: '' })} />Toutes les imprimantes activées de ce poste</label><p className="mt-1 text-xs text-slate-500">Cette option inclut les imprimantes installées ultérieurement.</p>{rule.printers !== null && <div className="mt-3 grid gap-2 sm:grid-cols-2">{knownNames.map(name => { const p = data.printers.find(p => p.name === name); return <label className="flex items-start gap-2 text-sm" key={name}><input type="checkbox" className="mt-0.5" checked={rule.printers!.includes(name)} disabled={p?.managed === false} onChange={e => updateRule({ printers: e.target.checked ? [...rule.printers!, name] : rule.printers!.filter(n => n !== name), ...(!e.target.checked && rule.default_printer === name ? { default_printer: '' } : {}) })} /><span>{name}{!p ? ' · Non installée' : !p.managed ? ' · Non disponible' : draft.printers[name]?.enabled === false ? ' · Désactivée' : ''}</span></label> })}</div>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="printer-default" className="mb-1.5 block text-sm font-medium text-slate-700">Imprimante préférée</label><select id="printer-default" className={input} value={rule.default_printer} onChange={e => updateRule({ default_printer: e.target.value })}><option value="">Par défaut Windows, si autorisée</option>{knownNames.filter(name => rule.printers === null || rule.printers.includes(name)).map(name => <option value={name} key={name}>{name}</option>)}</select></div><div><label htmlFor="printer-max-copies" className="mb-1.5 block text-sm font-medium text-slate-700">Copies maximum par impression</label><input id="printer-max-copies" className={input} type="number" min={1} max={100} value={rule.max_copies} onChange={e => updateRule({ max_copies: Number(e.target.value) })} /></div></div>
          <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.color} onChange={e => updateRule({ color: e.target.checked })} />Autoriser la couleur</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.duplex} onChange={e => updateRule({ duplex: e.target.checked })} />Autoriser le recto verso</label></div>
        </fieldset>
        <p className="text-xs text-slate-500">Les droits propres à l’utilisateur remplacent ceux du rôle pour l’impression. Les accès aux dossiers et aux fonctions de la clinique restent nécessaires. Les nouveaux rôles n’impriment pas tant que leurs droits ne sont pas activés.</p>
        {dirty && <p role="status" className="text-xs font-medium text-amber-700">Modifications à enregistrer</p>}
      </div>
    </section>}
    {data && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-800">Historique des impressions</h2><p className="mt-1 text-xs text-slate-500">Les 100 dernières demandes. « Envoyé au pilote » confirme l’envoi, sans confirmer la sortie du papier.</p></div><div className="overflow-x-auto"><table className="settings-table w-full text-sm"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500">{['Date', 'Utilisateur', 'Document', 'Imprimante', 'Copies', 'État'].map(c => <th className="px-5 py-3 text-left" key={c}>{c}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{jobs.map(j => <tr key={j.id}><td className="whitespace-nowrap px-5 py-3">{new Date(j.created_at).toLocaleString('fr-FR')}</td><td className="px-5 py-3">{j.actor}</td><td className="px-5 py-3">{j.title}<p className="text-xs text-slate-500">{j.document_type}</p></td><td className="px-5 py-3">{j.printer}</td><td className="px-5 py-3">{j.copies}</td><td className={`px-5 py-3 ${j.status === 'failed' ? 'text-red-600' : 'text-slate-600'}`}>{statuses[j.status]}{j.error && <p className="text-xs">{j.error}</p>}</td></tr>)}</tbody></table>{!jobs.length && <p className="p-5 text-sm text-slate-500">Aucune impression enregistrée.</p>}</div></section>}
  </div>
}
