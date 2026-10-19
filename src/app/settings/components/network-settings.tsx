import { useEffect, useState } from 'react'
import { Network, Copy, Download, RefreshCw, Save, Monitor, ExternalLink } from 'lucide-react'
import { useAccountStore } from '@/stores/account-store'
import { fetchApi } from '@/lib/api'
import { copyText } from '@/lib/utils'
import { toast } from 'sonner'

interface NetworkInfo {
  settings: { enabled: boolean; port: number }; computer: string; active_port: number
  port_managed_by_environment: boolean; local_url: string; frontend_ready: boolean
  addresses: Array<{ name: string; address: string; url: string }>; port_changed?: boolean
}
const primary = 'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50'
const secondary = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50'

export function NetworkSettingsPanel() {
  const account = useAccountStore(s => s.user), token = useAccountStore(s => s.token)
  const [info, setInfo] = useState<NetworkInfo | null>(null), [enabled, setEnabled] = useState(true), [port, setPort] = useState(3001)
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!account?.is_super_admin) { setLoading(false); return }
    let cancelled = false
    setLoading(true); setError(''); setInfo(null)
    fetchApi<NetworkInfo>('/network-settings').then(data => {
      if (!cancelled) { setInfo(data); setEnabled(data.settings.enabled); setPort(data.active_port) }
    }).catch(err => { if (!cancelled) setError(err.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, account?.is_super_admin, retry])
  if (!account?.is_super_admin) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-lg text-slate-800">Réseau local</h2><p className="mt-2 text-sm text-slate-600">Connectez-vous au compte super administrateur pour configurer le réseau.</p></section>
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Network className="size-5 text-indigo-600" />Réseau local</h2><p className="mt-1 text-xs text-slate-500">Une base commune pour les postes de la clinique</p></div><button type="button" className={secondary} disabled={busy || loading} onClick={() => setRetry(r => r + 1)}><RefreshCw className="size-4" />Actualiser</button></div>
    <div className="space-y-5 p-5">
      {loading && <p role="status" className="text-sm text-slate-500">Chargement de la configuration…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {info && <><div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-4"><Monitor className="size-7 shrink-0 text-indigo-600" /><div><p className="font-semibold text-slate-800">Poste serveur : {info.computer}</p><p className="text-xs text-slate-600">Ce poste conserve les dossiers et doit rester allumé pendant l’utilisation des autres postes.</p></div></div>
        <form className="space-y-4" onSubmit={async event => {
          event.preventDefault(); if (busy) return; setBusy(true); setError('')
          try {
            const saved = await fetchApi<NetworkInfo>('/network-settings', { method: 'PUT', body: JSON.stringify({ enabled, port }) })
            setInfo(saved); toast.success('Configuration réseau enregistrée')
            if (saved.port_changed && window.location.port !== '5173' && window.location.port !== '5174') {
              const next = new URL(window.location.href); next.port = String(saved.active_port)
              window.location.assign(next.href)
            }
          } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
        }}>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-800">Autoriser les postes du réseau local<button type="button" role="switch" aria-label="Activer le réseau local" aria-checked={enabled} disabled={busy} className={`toggle ${enabled ? 'on' : ''}`} onClick={() => setEnabled(v => !v)} /></label>
          <div className="max-w-xs"><label htmlFor="network-port" className="mb-1.5 block text-sm font-medium text-slate-700">Port de l’application</label><input id="network-port" type="number" min={1024} max={65535} required value={port} disabled={busy || info.port_managed_by_environment} onChange={e => setPort(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /><p className="mt-1 text-xs text-slate-500">{info.port_managed_by_environment ? 'Défini au lancement du serveur.' : 'Le changement de port s’applique immédiatement et demande une nouvelle connexion.'}</p></div>
          <button type="submit" className={primary} disabled={busy || !Number.isInteger(port) || port < 1024 || port > 65535}><Save className="size-4" />{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
        <div className="space-y-3 border-t border-slate-100 pt-5"><h3 className="font-semibold text-slate-800">Adresses à ouvrir sur les autres PC</h3><p className="text-sm text-slate-500">Connectez les postes au même réseau, puis ouvrez une adresse ci-dessous dans leur navigateur. Les données seront enregistrées sur ce serveur.</p>
          {!info.settings.enabled ? <p className="text-sm text-slate-500">Le réseau est désactivé. L’application reste disponible sur le poste serveur.</p> : info.addresses.length ? info.addresses.map(item => <div key={item.address} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div className="min-w-0"><a href={item.url} target="_blank" rel="noreferrer" className="break-all font-semibold text-indigo-600">{item.url}<ExternalLink className="ml-2 inline size-3" /></a><p className="mt-1 text-xs text-slate-500">{item.name}</p></div><button type="button" className={secondary} onClick={() => void copyText(item.url).then(() => toast.success('Adresse copiée')).catch(err => setError(err.message))}><Copy className="size-4" />Copier</button></div>) : <p className="text-sm text-amber-700">Aucune connexion réseau détectée. Connectez le serveur au Wi-Fi ou à un câble Ethernet, puis actualisez.</p>}
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-800">Accès Windows</h3><p className="text-sm text-slate-500">Si Windows bloque l’accès, exécutez ce fichier PowerShell en administrateur sur le serveur. Il autorise uniquement le sous-réseau local sur les réseaux privés et de domaine. Téléchargez-le à nouveau après un changement de port.</p><button type="button" className={secondary} disabled={busy || !info.settings.enabled} onClick={async () => {
          try {
            const response = await fetch('/api/network-settings/firewall.ps1', { headers: { Authorization: `Bearer ${token}` } })
            if (!response.ok) throw new Error('Téléchargement indisponible.')
            const url = URL.createObjectURL(await response.blob()), link = document.createElement('a'); link.href = url; link.download = 'autoriser-cima-reseau.ps1'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
          } catch (err) { setError((err as Error).message) }
        }}><Download className="size-4" />Fichier d’autorisation Windows</button></div>
        {!info.frontend_ready && <p className="text-sm text-amber-700">Le serveur doit préparer l’interface avec « npm run build » avant d’utiliser les adresses réseau.</p>}
      </>}
    </div>
  </section>
}
