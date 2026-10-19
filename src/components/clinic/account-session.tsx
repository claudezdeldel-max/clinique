import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccountStore } from '@/stores/account-store'
import { fetchApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PasswordLoginForm } from './password-login-form'

export function AccountSession({ onSelected }: { onSelected?: () => void }) {
  const user = useAccountStore(s => s.user)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return <div className="space-y-2 p-2">
    <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>{user ? 'Changer de compte' : 'Se connecter'}</Button>
    {user && <Button variant="ghost" className="w-full" onClick={async () => {
      try { await fetchApi('/auth/logout', { method: 'POST' }) } finally { useAccountStore.getState().clear(); navigate('/auth/sign-in') }
    }}>Déconnexion</Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Connexion</DialogTitle><DialogDescription>Entrez le mot de passe du compte à utiliser.</DialogDescription></DialogHeader><PasswordLoginForm onConnected={() => {
      setOpen(false)
      const role = useAccountStore.getState().user?.role
      navigate(role === 'radiologist' ? '/medecin' : role === 'secretary' ? '/secretariat' : '/dashboard-2')
      onSelected?.()
    }} /></DialogContent></Dialog>
  </div>
}
