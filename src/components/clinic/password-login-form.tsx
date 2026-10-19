import { useState } from 'react'
import { LockKeyhole, Eye, EyeOff } from 'lucide-react'
import { loginWithPassword } from '@/lib/api'
import { useAccountStore } from '@/stores/account-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function PasswordLoginForm({ onConnected }: { onConnected?: () => void }) {
  const [password, setPassword] = useState(''), [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const session = await loginWithPassword(password)
      useAccountStore.getState().setSession(session.token, session.user)
      setPassword(''); onConnected?.()
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }}>
    <div className="space-y-2"><Label htmlFor="login-password">Mot de passe</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input id="login-password" name="password" autoFocus autoComplete="current-password" required maxLength={128} type={visible ? 'text' : 'password'} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-background py-2.5 pl-10 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" /><button type="button" disabled={busy} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-3 text-slate-400" onClick={() => setVisible(v => !v)}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Button type="submit" className="w-full" disabled={busy || !password}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
  </form>
}
