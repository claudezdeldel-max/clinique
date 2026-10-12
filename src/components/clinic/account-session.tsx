import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccountStore, type AccountDirectory } from '@/stores/account-store'
import { fetchApi, getAccountDirectory, selectAccount } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function AccountSession({ onSelected }: { onSelected?: () => void }) {
  const { user, setSession, clear } = useAccountStore()
  const [open, setOpen] = useState(false)
  const [directory, setDirectory] = useState<AccountDirectory>({ roles: [], accounts: [] })
  const [role, setRole] = useState('')
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const [retry, setRetry] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true); setError('')
    getAccountDirectory().then(data => {
      if (!cancelled) setDirectory(data)
    }).catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, retry])

  const accounts = directory.accounts.filter(account => account.role === role)
  const openSelector = () => {
      setRole(user?.role || ''); setAccountId(''); setSelectionError(''); setOpen(true)
  }
  return <div className="space-y-2 p-2">
    <Button variant="outline" className="w-full" onClick={openSelector}>{user ? 'Changer de compte' : 'Choisir un compte'}</Button>
    {user && <Button variant="ghost" className="w-full" onClick={async () => {
      try { await fetchApi('/auth/logout', { method: 'POST' }) } finally { clear(); navigate('/dashboard-2') }
    }}>Déconnexion</Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader>
      <DialogTitle>Choisir un rôle et un compte</DialogTitle>
      <DialogDescription>Sélectionnez votre rôle, puis le compte à utiliser. Aucun identifiant ni mot de passe n’est demandé.</DialogDescription>
    </DialogHeader>
      {loading ? <p>Chargement des comptes…</p> : error ? <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p><Button onClick={() => setRetry(value => value + 1)}>Réessayer</Button></div> : <form className="space-y-4" onSubmit={async e => {
        e.preventDefault(); if (busy) return; setBusy(true); setSelectionError('')
        try {
          const result = await selectAccount(Number(accountId))
          setSession(result.token, result.user); setOpen(false)
          toast.success(`Compte sélectionné : ${result.user.name}`); onSelected?.()
        } catch (err) { setSelectionError((err as Error).message) } finally { setBusy(false) }
      }}>
        {selectionError && <p role="alert" className="text-destructive">{selectionError}</p>}
        <div className="space-y-2"><Label htmlFor="session-role">Rôle à utiliser</Label>
          <select id="session-role" className="w-full border rounded-md p-2 bg-background" required disabled={busy} value={role} onChange={e => { setRole(e.target.value); setAccountId('') }}>
            <option value="">Choisir un rôle…</option>
            {directory.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label htmlFor="session-account">Compte à utiliser</Label>
          <select id="session-account" className="w-full border rounded-md p-2 bg-background" required disabled={!role || busy || accounts.length === 0} value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">Choisir un compte…</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </div>
        {role && accounts.length === 0 && <p className="text-sm text-muted-foreground">Aucun compte actif pour ce rôle. Un administrateur peut en créer dans les paramètres.</p>}
        <Button type="submit" disabled={busy || !accounts.some(account => String(account.id) === accountId)}>Utiliser ce compte</Button>
      </form>}
    </DialogContent></Dialog>
  </div>
}
