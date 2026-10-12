import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { ThemeBootstrap } from '@/components/theme-bootstrap'
import { useEffect } from 'react'
import { initGTM } from '@/utils/analytics'
import { fetchApi, ApiError } from '@/lib/api'
import { useAccountStore, type Account } from '@/stores/account-store'
import { Toaster } from '@/components/ui/sonner'
import { useClinicPreferencesStore } from '@/stores/clinic-preferences-store'
import { useRolePermissionsStore } from '@/stores/role-permissions-store'
import { toast } from 'sonner'
import { PrintDialog } from '@/components/clinic/print-dialog'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  const accountToken = useAccountStore(s => s.token)
  const sessionTimeout = useClinicPreferencesStore(s => s.preferences?.security.session_timeout || 0)
  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (!accountToken) { useClinicPreferencesStore.getState().clear(); return }
      try {
        await useClinicPreferencesStore.getState().refresh()
        if (active) useRolePermissionsStore.getState().applyServerPermissions(useClinicPreferencesStore.getState().preferences?.permissions || {})
      } catch { /* Settings must not prevent the account selector from opening. */ }
    }
    void refresh()
    window.addEventListener('clinic-settings-updated', refresh)
    const timer = setInterval(refresh, 15000)
    return () => { active = false; clearInterval(timer); window.removeEventListener('clinic-settings-updated', refresh) }
  }, [accountToken])
  useEffect(() => {
    if (!accountToken || !sessionTimeout) return
    let lastActivity = Date.now(), lastSent = 0
    const activity = () => {
      lastActivity = Date.now()
      if (lastActivity - lastSent > 15000) { lastSent = lastActivity; void fetchApi('/auth/activity', { method: 'POST' }).catch(() => {}) }
    }
    const expire = setInterval(() => {
      if (Date.now() - lastActivity >= sessionTimeout * 60000) {
        void fetchApi('/auth/logout', { method: 'POST' }).catch(() => {})
        useAccountStore.getState().clear(); toast.info('Session expirée après une période d’inactivité. Choisissez à nouveau un compte.')
      }
    }, 1000)
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    for (const event of events) window.addEventListener(event, activity, { passive: true })
    return () => { clearInterval(expire); for (const event of events) window.removeEventListener(event, activity) }
  }, [accountToken, sessionTimeout])
  // Initialize GTM on app load
  useEffect(() => {
    initGTM();
    const refresh = () => {
      const requestedToken = useAccountStore.getState().token
      if (requestedToken) fetchApi<{ user: Account }>('/auth/me')
        .then(({ user }) => { if (useAccountStore.getState().token === requestedToken) useAccountStore.getState().setUser(user) })
        .catch(err => { if (useAccountStore.getState().token === requestedToken && err instanceof ApiError && err.status === 401) useAccountStore.getState().clear() })
    }
    refresh()
    const timer = setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, []);

  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <Toaster richColors position="top-right" closeButton />
        <PrintDialog />
        <ThemeBootstrap />
        <SidebarConfigProvider>
          <Router basename={basename}>
            <AppRouter />
          </Router>
        </SidebarConfigProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
