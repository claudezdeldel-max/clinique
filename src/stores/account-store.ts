import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useRolePermissionsStore, type UserRole } from './role-permissions-store'

export const FEATURES = { reports: 'Comptes rendus', prescriptions: 'Prescriptions', images: 'Images', ready_files: 'Dossiers prêts', queue_calls: 'Appel des patients' }
export const EXAMS = { IRM: 'IRM', Scanner: 'Scanner', Echo: 'Échographie', Radio: 'Radiographie', Mammo: 'Mammographie', Other: 'Autres examens' }
export interface Account {
  id: number; username: string; name: string; role: UserRole; email: string; phone?: string; active: boolean; is_super_admin?: boolean
  features: Record<keyof typeof FEATURES, boolean>; call_exam_types: string[]
}
export interface AccountRole { id: string; name: string }
export function hasDossierAccess(user: Account | null) {
  return Boolean(user?.active && (user.features.reports || user.features.prescriptions || user.features.images))
}
export interface AccountDirectory {
  roles: AccountRole[]
  accounts: Pick<Account, 'id' | 'name' | 'role'>[]
}
interface AccountState {
  token: string | null; user: Account | null
  setSession: (token: string, user: Account) => void
  setUser: (user: Account) => void
  clear: () => void
}
export const useAccountStore = create<AccountState>()(persist((set) => ({
  token: null, user: null,
  setSession: (token, user) => { useRolePermissionsStore.getState().setRole(user.role); set({ token, user }) },
  setUser: (user) => { useRolePermissionsStore.getState().setRole(user.role); set({ user }) },
  clear: () => set({ token: null, user: null }),
}), { name: 'radiomed-account' }))

export function examCategory(value = ''): keyof typeof EXAMS {
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (text.includes('echo') || text.includes('doppler')) return 'Echo'
  if (text.includes('irm')) return 'IRM'
  if (text.includes('scanner') || /\bct\b/.test(text)) return 'Scanner'
  if (text.includes('mammo')) return 'Mammo'
  if (text.includes('radio')) return 'Radio'
  return 'Other'
}
export function canCallExam(user: Account | null, modality: string | undefined, echoDoctorId: number | null) {
  const exam = examCategory(modality)
  return Boolean(user?.active && user.features.queue_calls && user.call_exam_types.includes(exam)
    && (exam !== 'Echo' || !echoDoctorId || (user.id === echoDoctorId && user.role === 'radiologist')))
}
