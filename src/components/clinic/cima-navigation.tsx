// Navbar copied from Finance et compatbilite.html. JSX attributes, route targets and labels adapted for CIMA.
import { Link, useLocation } from 'react-router-dom'
import { Sidebar, useSidebar } from '@/components/ui/sidebar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AccountSession } from '@/components/clinic/account-session'
import { useAccountStore } from '@/stores/account-store'
import '@/styles/designs/cima-navigation.css'
import { NavigationCount } from '@/components/clinic/navigation-count'
import type { NavigationCounts } from '@/hooks/use-navigation-counts'

export function CimaNavigation({ allowedUrls, onCustomize, counts }: { allowedUrls: string[]; onCustomize: () => void; counts: NavigationCounts }) {
 const location = useLocation()
 const account = useAccountStore(state => state.user)
 const { setOpenMobile, isMobile } = useSidebar()
 return <Sidebar variant="sidebar" collapsible="offcanvas" side="left" className="cima-navigation">
 <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/inter.css`} />
     <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7h18M3 12h18M3 17h18"/>
        </svg>
      </div>
      <div>
        <h1 className="text-white font-bold text-lg leading-tight">CIMA</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Clinique</p>
      </div>
    </div>
 <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
 {["/dashboard-2"].some(url => allowedUrls.includes(url)) && <><p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Principal</p>
{allowedUrls.includes('/dashboard-2') && (<Link to="/dashboard-2" aria-current={location.pathname === '/dashboard-2' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/dashboard-2' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        Tableau de bord
      </Link>)}</>}
{["/patients","/queue-management","/rendez-vous"].some(url => allowedUrls.includes(url)) && <><p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Admission</p>
{allowedUrls.includes('/patients') && (<Link to="/patients" aria-current={location.pathname === '/patients' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/patients' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <span>Patients</span>
        <NavigationCount count={counts['/patients']} label="patients" />
      </Link>)}
{allowedUrls.includes('/queue-management') && (<Link to="/queue-management" aria-current={location.pathname === '/queue-management' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/queue-management' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        File d’attente
      </Link>)}
{allowedUrls.includes('/rendez-vous') && (<Link to="/rendez-vous" aria-current={location.pathname === '/rendez-vous' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/rendez-vous' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Rendez-vous
      </Link>)}</>}
{["/medecin","/chat"].some(url => allowedUrls.includes(url)) && <><p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gestion</p>
{allowedUrls.includes('/medecin') && (<Link to="/medecin" aria-current={location.pathname === '/medecin' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/medecin' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        Médecin
      </Link>)}

{allowedUrls.includes('/chat') && (<Link to="/chat" aria-current={location.pathname === '/chat' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/chat' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <span>Messagerie</span>
        <NavigationCount count={counts['/chat']} label="messages non lus" />
      </Link>)}</>}
{["/finance","/payments","/secretariat"].some(url => allowedUrls.includes(url)) && <><p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gestion</p>
{allowedUrls.includes('/finance') && (<Link to="/finance" aria-current={location.pathname === '/finance' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/finance' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Finance et Compta
      </Link>)}
{allowedUrls.includes('/payments') && (<Link to="/payments" aria-current={location.pathname === '/payments' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/payments' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>Paiements</span>
        <NavigationCount count={counts['/payments']} label="paiements du jour" />
      </Link>)}
{allowedUrls.includes('/secretariat') && (<Link to="/secretariat" aria-current={location.pathname === '/secretariat' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/secretariat' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        Secrétariat
      </Link>)}
</>}
{["/settings/user"].some(url => allowedUrls.includes(url)) && <><p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Système</p>
{allowedUrls.includes('/settings/user') && (<Link to="/settings/user" aria-current={location.pathname === '/settings/user' ? 'page' : undefined} onClick={() => setOpenMobile(false)} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ${location.pathname === '/settings/user' ? 'active' : ''}`}>
        <svg className="icon w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        Paramètres
      </Link>)}</>}
 </nav>
 <Popover>    <div className="p-3 border-t border-slate-800">
      <PopoverTrigger asChild><button type="button" aria-label="Menu du compte" className="flex w-full items-center gap-3 p-2 rounded-lg bg-slate-800/50 text-left cursor-pointer">
        <img src="https://i.pravatar.cc/100?img=12" className="w-9 h-9 rounded-full ring-2 ring-indigo-500/50" alt="" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{account?.name || 'Choisir un compte'}</p>
          <p className="text-[11px] text-slate-400 truncate">{account?.role || 'Session'}</p>
        </div>
      </button></PopoverTrigger>
      <PopoverContent side={isMobile ? "top" : "right"} align="end"><AccountSession /><button type="button" className="w-full p-2 text-sm hover:bg-accent rounded-md" onClick={onCustomize}>Personnaliser</button></PopoverContent>
    </div></Popover>
 </Sidebar>
}
