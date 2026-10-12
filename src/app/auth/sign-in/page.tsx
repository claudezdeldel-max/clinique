import { useNavigate } from 'react-router-dom'
import { AccountSession } from '@/components/clinic/account-session'
import { useAccountStore } from '@/stores/account-store'
import { Logo } from '@/components/logo'

export default function Page() {
  const navigate = useNavigate()
  return <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6">
    <div className="w-full max-w-sm bg-card border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3"><Logo size={32} /><h1 className="font-semibold text-xl">RadioMed OS</h1></div>
      <p className="text-muted-foreground text-sm">Choisissez votre rôle et votre compte pour accéder à l’application.</p>
      <AccountSession onSelected={() => {
        const role = useAccountStore.getState().user?.role
        navigate(role === 'radiologist' ? '/medecin' : role === 'secretary' ? '/secretariat' : '/dashboard-2')
      }} />
    </div>
  </div>
}
