import { useLocation, useNavigate } from 'react-router-dom'
import { PasswordLoginForm } from '@/components/clinic/password-login-form'
import { useAccountStore } from '@/stores/account-store'
import { Activity, ShieldCheck } from 'lucide-react'

export default function Page() {
  const navigate = useNavigate(), location = useLocation()
  return <main className="flex min-h-svh items-center justify-center bg-slate-100 p-6">
    <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-slate-800">
      <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white"><Activity className="size-6" /></div><div><h1 className="text-xl font-bold">CIMA</h1><p className="text-xs text-slate-500">Gestion de la clinique</p></div></div>
      <div><h2 className="text-lg font-semibold">Connexion</h2><p className="mt-1 text-sm text-slate-500">Entrez votre mot de passe pour accéder à votre espace.</p></div>
      <PasswordLoginForm onConnected={() => {
        const from = (location.state as { from?: string } | null)?.from
        const role = useAccountStore.getState().user?.role
        navigate(from?.startsWith('/') && !from.startsWith('//') && !from.startsWith('/auth/') ? from : role === 'radiologist' ? '/medecin' : role === 'secretary' ? '/secretariat' : '/dashboard-2', { replace: true })
      }} />
      <p className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400"><ShieldCheck className="size-4" />Les accès sont liés à votre compte.</p>
    </div>
  </main>
}
