import { useEffect, useState } from 'react'
import { getAccounts, getCallPolicy, saveAccount, saveCallPolicy, getAccountDirectory, createAccountRole } from '@/lib/api'
import { useAccountStore, FEATURES, EXAMS, type Account, type AccountRole } from '@/stores/account-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const empty = () => ({ name: '', email: '', password: '', role: 'radiologist' as Account['role'], active: true,
  features: { reports: true, prescriptions: true, images: true, ready_files: true, queue_calls: true }, call_exam_types: Object.keys(EXAMS) })
export function AccountManagement() {
  const user = useAccountStore(s => s.user)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [roles, setRoles] = useState<AccountRole[]>([])
  const [roleName, setRoleName] = useState('')
  const [selectedId, setSelectedId] = useState<number | undefined>()
  const [draft, setDraft] = useState<ReturnType<typeof empty>>(empty)
  const [echoDoctor, setEchoDoctor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      const [list, policy, directory] = await Promise.all([getAccounts(), getCallPolicy(), getAccountDirectory()])
      setAccounts(list); setRoles(directory.roles); setEchoDoctor(policy.echo_doctor_id ? String(policy.echo_doctor_id) : ''); setError('')
    } catch (err) { setError((err as Error).message) }
  }
  useEffect(() => { if (user?.role === 'admin') void load() }, [user?.id, user?.role])
  if (user?.role !== 'admin') return <Card><CardHeader><CardTitle>Comptes et fonctions</CardTitle><CardDescription>Connectez-vous avec un compte administrateur depuis le menu latéral pour gérer les comptes.</CardDescription></CardHeader></Card>
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Comptes et fonctions</CardTitle><CardDescription>Créez des comptes par rôle et configurez leurs fonctions. Chaque utilisateur se connecte avec son mot de passe personnel.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {error && <div role="alert" className="text-destructive">{error}<Button variant="outline" onClick={load}>Réessayer</Button></div>}
        <div className="flex flex-wrap gap-2">{accounts.map(account => <Button key={account.id} disabled={busy} variant={selectedId === account.id ? 'default' : 'outline'} onClick={() => { setSelectedId(account.id); setDraft({ ...account, password: '' }) }}>{account.name}{!account.active && ' (désactivé)'}</Button>)}
          <Button disabled={busy} variant="secondary" onClick={() => { setSelectedId(undefined); setDraft(empty()) }}>Nouveau compte</Button>
        </div>
        <form className="space-y-5" onSubmit={async e => {
          e.preventDefault(); setBusy(true)
          try {
            const saved = await saveAccount(draft, selectedId)
            if (saved.id === user.id) useAccountStore.getState().setUser(saved)
            setSelectedId(saved.id); setDraft({ ...saved, password: '' }); await load(); toast.success('Compte enregistré')
          } catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
        }}>
          <div className="grid sm:grid-cols-2 gap-4">
            {(['name', 'email'] as const).map(key => <div key={key} className="space-y-2"><Label htmlFor={`account-${key}`}>{key === 'name' ? 'Nom du compte' : 'Email (facultatif)'}</Label><Input id={`account-${key}`} type={key === 'email' ? 'email' : 'text'} required={key === 'name'} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></div>)}
            <div className="space-y-2"><Label htmlFor="account-password">{selectedId ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}</Label><Input id="account-password" type="password" autoComplete="new-password" required={!selectedId} minLength={4} maxLength={128} value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="account-role">Rôle</Label><select id="account-role" className="w-full rounded-md border p-2 bg-background" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
            <div className="flex items-center gap-3"><Switch id="account-active" checked={draft.active} onCheckedChange={active => setDraft({ ...draft, active })} /><Label htmlFor="account-active">Compte actif</Label></div>
          </div>
          <fieldset className="space-y-3"><legend className="font-semibold mb-3">Fonctions activées</legend><div className="grid sm:grid-cols-2 gap-3">{Object.entries(FEATURES).map(([key, label]) => <div key={key} className="flex items-center justify-between border rounded-lg p-3"><Label htmlFor={`feature-${key}`}>{label}</Label><Switch id={`feature-${key}`} checked={draft.features[key as keyof typeof FEATURES]} onCheckedChange={checked => setDraft({ ...draft, features: { ...draft.features, [key]: checked } })} /></div>)}</div></fieldset>
          <fieldset disabled={!draft.features.queue_calls} className="space-y-3 disabled:opacity-50"><legend className="font-semibold mb-3">Appel autorisé par type d’examen</legend><div className="grid sm:grid-cols-3 gap-3">{Object.entries(EXAMS).map(([key, label]) => <div key={key} className="flex gap-3 items-center"><Switch id={`exam-${key}`} checked={draft.call_exam_types.includes(key)} onCheckedChange={checked => setDraft({ ...draft, call_exam_types: checked ? [...draft.call_exam_types, key] : draft.call_exam_types.filter(k => k !== key) })} /><Label htmlFor={`exam-${key}`}>{label}</Label></div>)}</div></fieldset>
          <Button disabled={busy} type="submit">{selectedId ? 'Enregistrer le compte' : 'Créer le compte'}</Button>
        </form>
      </CardContent></Card>
    <Card><CardHeader><CardTitle>Rôles disponibles</CardTitle><CardDescription>Les rôles ajoutés ici seront proposés lors du choix du compte.</CardDescription></CardHeader><CardContent>
      <form className="flex flex-wrap items-end gap-3" onSubmit={async e => {
        e.preventDefault(); setBusy(true)
        try { const created = await createAccountRole(roleName); setRoles(previous => [...previous, created]); setRoleName(''); toast.success('Rôle ajouté') }
        catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
      }}><div className="space-y-2"><Label htmlFor="new-role-name">Nom du nouveau rôle</Label><Input id="new-role-name" required maxLength={100} value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Ex. Technicien" /></div><Button type="submit" disabled={busy || !roleName.trim()}>Ajouter le rôle</Button></form>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Appels d’échographie</CardTitle><CardDescription>Réservez les appels à un seul compte médecin. Les autres comptes ne pourront ni appeler ni rappeler ces patients.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3">
      <Label htmlFor="echo-doctor" className="sr-only">Médecin réservé pour l’échographie</Label>
      <select id="echo-doctor" className="rounded-md border p-2 bg-background" value={echoDoctor} onChange={e => setEchoDoctor(e.target.value)}><option value="">Tous les comptes autorisés</option>{accounts.filter(a => a.active && a.role === 'radiologist' && a.features.queue_calls && a.call_exam_types.includes('Echo')).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <Button disabled={busy} onClick={async () => { setBusy(true); try { await saveCallPolicy(echoDoctor ? Number(echoDoctor) : null); toast.success('Réservation enregistrée') } catch (err) { toast.error((err as Error).message) } finally { setBusy(false) } }}>Enregistrer la réservation</Button>
    </CardContent></Card>
  </div>
}
