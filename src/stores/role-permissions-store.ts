import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = string

export interface NavItemConfig {
  id: string
  title: string
  url: string
  group: 'Clinique & Patients' | 'Services Médicaux' | 'Administration & Finance'
}

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', title: 'Tableau de bord', url: '/dashboard-2', group: 'Clinique & Patients' },
  { id: 'queue', title: "File d'attente", url: '/queue-management', group: 'Clinique & Patients' },
  { id: 'patients', title: 'Registre Patients', url: '/patients', group: 'Clinique & Patients' },
  { id: 'tasks', title: 'Tâches', url: '/tasks', group: 'Clinique & Patients' },
  { id: 'rendez_vous', title: 'Rendez-vous', url: '/rendez-vous', group: 'Clinique & Patients' },
  { id: 'medecin', title: 'Espace Médecin', url: '/medecin', group: 'Services Médicaux' },
  { id: 'comptes_rendus', title: 'Comptes-Rendus', url: '/comptes-rendus', group: 'Services Médicaux' },
  { id: 'chat', title: 'Messagerie Interne', url: '/chat', group: 'Services Médicaux' },
  { id: 'finance', title: 'Finance & Comptabilité', url: '/finance', group: 'Administration & Finance' },
  { id: 'payments', title: 'Règlements & Quittances', url: '/payments', group: 'Administration & Finance' },
  { id: 'salles_calendrier', title: 'Salles & Calendrier', url: '/calendar', group: 'Administration & Finance' },
  { id: 'settings', title: 'Paramètres', url: '/settings/user', group: 'Administration & Finance' },
]

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ALL_NAV_ITEMS.map((item) => item.url),
  secretary: [
    '/dashboard-2',
    '/queue-management',
    '/patients',
    '/tasks',
    '/rendez-vous',
    '/calendar',
    '/payments',
    '/chat',
    '/settings/user',
  ],
  radiologist: [
    '/dashboard-2',
    '/queue-management',
    '/patients',
    '/tasks',
    '/rendez-vous',
    '/calendar',
    '/medecin',
    '/comptes-rendus',
    '/chat',
    '/settings/user',
  ],
}

// Administrators retain the same navigation rights as the server, even when an
// older browser has cached a reduced menu from the previous settings screen.
export function navigationPermissions(role: UserRole, permissions: Record<UserRole, string[]>) {
  return role === 'admin' ? DEFAULT_ROLE_PERMISSIONS.admin
    : permissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || ALL_NAV_ITEMS.map(item => item.url)
}

interface RolePermissionsState {
  currentRole: UserRole
  rolePermissions: Record<UserRole, string[]>
  serverRoles: string[]
  setRole: (role: UserRole) => void
  togglePermission: (role: UserRole, url: string) => void
  resetPermissions: () => void
  applyServerPermissions: (permissions: Record<string, Record<string, { view: boolean }>>) => void
}

export const useRolePermissionsStore = create<RolePermissionsState>()(
  persist(
    (set) => ({
      currentRole: 'admin',
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      serverRoles: [],

      setRole: (role: UserRole) => set(state => ({ currentRole: role, rolePermissions: { ...state.rolePermissions, admin: DEFAULT_ROLE_PERMISSIONS.admin } })),

      togglePermission: (role: UserRole, url: string) =>
        set((state) => {
          if (role === 'admin') return { rolePermissions: { ...state.rolePermissions, admin: DEFAULT_ROLE_PERMISSIONS.admin } }
          const currentUrls = state.rolePermissions[role] || []
          const hasUrl = currentUrls.includes(url)
          const updatedUrls = hasUrl
            ? currentUrls.filter((u) => u !== url)
            : [...currentUrls, url]

          return {
            rolePermissions: {
              ...state.rolePermissions,
              [role]: updatedUrls,
            },
          }
        }),

      resetPermissions: () =>
        set({
          rolePermissions: DEFAULT_ROLE_PERMISSIONS,
          serverRoles: [],
        }),
      applyServerPermissions: (permissions) => set(state => {
        const modules: Record<string, string> = { '/dashboard-2': 'dashboard', '/queue-management': 'queue', '/patients': 'patients', '/rendez-vous': 'appointments', '/medecin': 'queue', '/comptes-rendus': 'reports', '/chat': 'chat', '/finance': 'finance', '/payments': 'payments', '/calendar': 'appointments', '/settings/user': 'settings' }
        const rolePermissions = { ...state.rolePermissions }
        for (const role of state.serverRoles || []) if (!permissions[role]) rolePermissions[role] = DEFAULT_ROLE_PERMISSIONS[role] || ALL_NAV_ITEMS.map(i => i.url)
        for (const [role, policy] of Object.entries(permissions)) {
          if (role === 'admin') continue
          const current = DEFAULT_ROLE_PERMISSIONS[role] || ALL_NAV_ITEMS.map(i => i.url)
          rolePermissions[role] = ALL_NAV_ITEMS.filter(i => {
            if (i.url === '/comptes-rendus') return ['reports', 'prescriptions', 'images'].some(id => policy[id]?.view ?? current.includes(i.url))
            return policy[modules[i.url]]?.view ?? current.includes(i.url)
          }).map(i => i.url)
        }
        rolePermissions.admin = DEFAULT_ROLE_PERMISSIONS.admin
        return { rolePermissions, serverRoles: Object.keys(permissions) }
      }),
    }),
    {
      name: 'clinique-role-permissions',
      version: 1,
      migrate: persisted => {
        const state = persisted as Partial<RolePermissionsState>
        return { ...state, rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS, ...state.rolePermissions, admin: DEFAULT_ROLE_PERMISSIONS.admin } }
      },
    }
  )
)
